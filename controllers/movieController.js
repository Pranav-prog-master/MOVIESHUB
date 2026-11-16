const Movie = require('../models/Movie');
const Genre = require('../models/Genre');
const slugify = require('../utils/slug');
const { getEmbedUrl } = require('../utils/media');
const db = require('../config/database');

// When the database is unreachable we render empty states instead of erroring.
const NO_DB = (res, view, data) => res.render(view, Object.assign({ title: 'XP Movies' }, data));

// ---------- helpers ----------

function parseList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSources(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && s.name && s.url)
      .map((s) => ({
        name: String(s.name).trim(),
        type: ['Streaming', 'Rental', 'Purchase', 'Download'].includes(s.type) ? s.type : 'Streaming',
        url: String(s.url).trim()
      }));
  } catch (_) {
    return [];
  }
}

async function uniqueSlug(base) {
  const root = slugify(base) || 'movie';
  let slug = root;
  let i = 1;
  while (await Movie.exists({ slug })) {
    slug = `${root}-${i++}`;
  }
  return slug;
}

function safeExternalUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch (_) {
    return '';
  }
}

function parseEpisodesFromBody(data) {
  const labels = [].concat(data['episodeLabel'] || []);
  const urls   = [].concat(data['episodeUrl']   || []);
  const result = [];
  for (let i = 0; i < urls.length; i++) {
    const url = String(urls[i] || '').trim();
    if (url) result.push({ label: String(labels[i] || `Episode ${i + 1}`).trim(), url });
  }
  return result;
}

function buildMovieDoc(data) {
  const doc = {
    title: data.title,
    description: data.description || '',
    category: ['Hollywood', 'Bollywood', 'South', 'Anime', 'Cartoon'].includes(data.category) ? data.category : 'Hollywood',
    releaseYear: data.releaseYear ? parseInt(data.releaseYear, 10) : undefined,
    releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined,
    runtime: data.runtime ? parseInt(data.runtime, 10) : undefined,
    genres: parseList(data.genres),
    rating: data.rating ? parseFloat(data.rating) : 0,
    cast: parseList(data.cast),
    director: data.director || '',
    trailerUrl: data.trailerUrl || '',
    watchUrl: safeExternalUrl(data.watchUrl),
    downloadUrl: data.downloadUrl || '',
    episodes: Array.isArray(data.episodes)
      ? data.episodes.filter(e => e && e.url).map(e => ({ label: String(e.label || '').trim(), url: String(e.url).trim() }))
      : (data['episodes[label]'] || data['episodes[url]']
          ? []
          : parseEpisodesFromBody(data)),
    type: ['Movie', 'Series'].includes(data.type) ? data.type : 'Movie',
    status: data.status === 'draft' ? 'draft' : 'published',
    popularity: data.popularity ? parseFloat(data.popularity) : 0,
    sources: parseSources(data.sources)
  };
  doc.slug = data.slug ? slugify(data.slug) : undefined;
  return doc;
}

// Build a Mongo filter from common query params (search / genre / year / status).
function buildFilter(query, { onlyPublished = true } = {}) {
  const filter = {};
  if (onlyPublished) filter.status = 'published';

  if (query.q) {
    const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = { $regex: escaped, $options: 'i' };
  }
  if (query.genre) {
    filter.genres = { $in: [query.genre] };
  }
  if (query.category) {
    filter.category = query.category;
  }
  if (query.year) {
    const y = parseInt(query.year, 10);
    if (!isNaN(y)) filter.releaseYear = y;
  }
  return filter;
}

function sortOption(sort) {
  switch (sort) {
    case 'rating':
      return { rating: -1 };
    case 'year':
      return { releaseYear: -1 };
    case 'popularity':
    case 'trending':
    default:
      return { popularity: -1, rating: -1 };
  }
}

async function findBySlugOrId(id) {
  if (!id) return null;
  // Try ObjectId first.
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    const byId = await Movie.findById(id);
    if (byId) return byId;
  }
  return Movie.findOne({ slug: id });
}

// ---------- web pages ----------

exports.getHome = async (req, res, next) => {
  const emptyCategories = { hollywood: [], bollywood: [], south: [], anime: [], cartoon: [] };
  if (!db.isConnected()) {
    return NO_DB(res, 'index', { featured: null, ...emptyCategories });
  }
  try {
    const published = { status: 'published' };
    const [featured, hollywood, bollywood, south, anime, cartoon] = await Promise.all([
      Movie.findOne(published).sort({ rating: -1, popularity: -1 }),
      Movie.find({ ...published, category: 'Hollywood' }).sort({ releaseYear: -1, popularity: -1 }).limit(12),
      Movie.find({ ...published, category: 'Bollywood' }).sort({ releaseYear: -1, popularity: -1 }).limit(12),
      Movie.find({ ...published, category: 'South' }).sort({ releaseYear: -1, popularity: -1 }).limit(12),
      Movie.find({ ...published, category: 'Anime' }).sort({ releaseYear: -1, popularity: -1 }).limit(12),
      Movie.find({ ...published, category: 'Cartoon' }).sort({ releaseYear: -1, popularity: -1 }).limit(12)
    ]);
    res.render('index', {
      title: 'XP Movies — Discover Movies',
      featured, hollywood, bollywood, south, anime, cartoon
    });
  } catch (err) {
    next(err);
  }
};

exports.getMovies = async (req, res, next) => {
  if (!db.isConnected()) {
    return NO_DB(res, 'movies', { movies: [], genres: [], categories: ['Hollywood', 'Bollywood', 'South', 'Anime', 'Cartoon'], query: req.query, page: 1, totalPages: 1, total: 0 });
  }
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 24;
    const filter = buildFilter(req.query);
    const [movies, total, genres] = await Promise.all([
      Movie.find(filter)
        .sort(sortOption(req.query.sort))
        .skip((page - 1) * limit)
        .limit(limit),
      Movie.countDocuments(filter),
      Genre.find().sort({ name: 1 })
    ]);
    res.render('movies', {
      title: 'Browse Movies',
      movies,
      genres,
      categories: ['Hollywood', 'Bollywood', 'South', 'Anime', 'Cartoon'],
      query: req.query,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total
    });
  } catch (err) {
    next(err);
  }
};

exports.getGenres = async (req, res, next) => {
  if (!db.isConnected()) return NO_DB(res, 'genres', { genres: [] });
  try {
    const genres = await Genre.find().sort({ name: 1 });
    const withCounts = await Promise.all(
      genres.map(async (g) => ({
        ...g.toObject(),
        count: await Movie.countDocuments({ genres: g.name, status: 'published' })
      }))
    );
    res.render('genres', { title: 'Genres', genres: withCounts });
  } catch (err) {
    next(err);
  }
};

exports.getByCategory = async (req, res, next) => {
  const categoryMap = {
    hollywood: 'Hollywood',
    bollywood: 'Bollywood',
    south: 'South',
    anime: 'Anime',
    cartoon: 'Cartoon'
  };
  const category = categoryMap[req.params.slug.toLowerCase()];
  if (!category) return res.status(404).render('error', { title: 'Not Found', message: 'Category not found.', status: 404 });
  if (!db.isConnected()) {
    return NO_DB(res, 'movies', { movies: [], genres: [], categories: Object.values(categoryMap), query: { category }, page: 1, totalPages: 1, total: 0, heading: category });
  }
  try {
    const movies = await Movie.find({ category, status: 'published' }).sort({ releaseYear: -1, popularity: -1 });
    res.render('movies', {
      title: `${category} Movies`, movies, genres: [], categories: Object.values(categoryMap),
      query: { category }, page: 1, totalPages: 1, total: movies.length, heading: category
    });
  } catch (err) {
    next(err);
  }
};

exports.getByGenre = async (req, res, next) => {
  if (!db.isConnected()) return NO_DB(res, 'movies', { movies: [], genres: [], query: { genre: req.params.slug }, page: 1, totalPages: 1, total: 0 });
  try {
    const genre = await Genre.findOne({ slug: req.params.slug });
    const name = genre ? genre.name : req.params.slug;
    const movies = await Movie.find({ genres: name, status: 'published' }).sort({ rating: -1 });
    res.render('movies', {
      title: `${name} Movies`,
      movies,
      genres: [],
      query: { genre: name },
      page: 1,
      totalPages: 1,
      total: movies.length,
      heading: `${name} Movies`
    });
  } catch (err) {
    next(err);
  }
};

exports.getSearch = async (req, res, next) => {
  if (!db.isConnected()) return NO_DB(res, 'search', { q: (req.query.q || '').toString().trim(), movies: [], suggestions: [] });
  try {
    const q = (req.query.q || '').toString().trim();
    let movies = [];
    if (q) {
      movies = await Movie.find(buildFilter({ q })).sort(sortOption(req.query.sort)).limit(60);
    }
    // Search suggestions: titles matching the prefix.
    let suggestions = [];
    if (q) {
      suggestions = await Movie.find({
        status: 'published',
        title: { $regex: `^${q}`, $options: 'i' }
      })
        .limit(8)
        .select('title slug');
    }
    res.render('search', {
      title: q ? `Search: ${q}` : 'Search',
      q,
      movies,
      suggestions
    });
  } catch (err) {
    next(err);
  }
};

exports.getMovie = async (req, res, next) => {
  if (!db.isConnected()) return res.status(503).render('error', { title: 'Database offline', message: 'The database is not connected. Start MongoDB or allow the in-memory fallback.', status: 503 });
  try {
    const movie = await findBySlugOrId(req.params.id);
    if (!movie || movie.status !== 'published') return res.status(404).render('error', { title: 'Not Found', message: 'Movie not found.', status: 404 });
    const related = await Movie.find({
      _id: { $ne: movie._id },
      category: movie.category,
      status: 'published'
    }).limit(8);
    const embedTrailer = getEmbedUrl(movie.trailerUrl);
    res.render('movie-details', {
      title: movie.title,
      movie,
      related,
      embedTrailer
    });
  } catch (err) {
    next(err);
  }
};

exports.getWatch = async (req, res, next) => {
  if (!db.isConnected()) return res.status(503).render('error', { title: 'Database offline', message: 'The database is not connected. Start MongoDB or allow the in-memory fallback.', status: 503 });
  try {
    const movie = await findBySlugOrId(req.params.id);
    if (!movie || movie.status !== 'published') {
      return res.status(404).render('error', { title: 'Not Found', message: 'Movie not found.', status: 404 });
    }
    if (!movie.watchUrl) {
      return res.status(404).render('error', { title: 'Link unavailable', message: 'No external watch link has been added for this listing.', status: 404 });
    }
    const destination = new URL(movie.watchUrl);
    if (!['http:', 'https:'].includes(destination.protocol)) {
      return res.status(400).render('error', { title: 'Invalid link', message: 'The external link is invalid.', status: 400 });
    }
    return res.redirect(destination.toString());
  } catch (err) {
    next(err);
  }
};

// External "Discover" — uses TMDB when a key is configured, otherwise local library.
exports.discover = async (req, res, next) => {
  if (!db.isConnected()) {
    const q = (req.query.q || '').toString().trim();
    if (req.originalUrl.startsWith('/api/')) return res.json({ success: true, source: 'none', query: q, results: [] });
    return NO_DB(res, 'discover', { q, results: [], source: 'none' });
  }
  try {
    const q = (req.query.q || '').toString().trim();
    let results = [];
    let source = 'none';
    if (q) {
      const ext = await tmdbSearch(q);
      if (ext && ext.length) {
        results = ext;
        source = 'tmdb';
      } else {
        results = await Movie.find(buildFilter({ q })).sort({ rating: -1 }).limit(20);
        source = 'local';
      }
    }
    if (req.originalUrl.startsWith('/api/')) {
      return res.json({ success: true, source, query: q, results });
    }
    res.render('discover', { title: 'Discover', q, results, source });
  } catch (err) {
    next(err);
  }
};

async function tmdbSearch(query) {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(
      key
    )}&query=${encodeURIComponent(query)}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.results || []).map((r) => ({
      title: r.title,
      year: r.release_date ? r.release_date.slice(0, 4) : '',
      description: r.overview || '',
      rating: r.vote_average || 0,
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
      external: true,
      officialSources: []
    }));
  } catch (_) {
    return null;
  }
}

// ---------- web CRUD (admin) ----------

exports.createMovie = async (req, res, next) => {
  try {
    const doc = buildMovieDoc(req.body);
    doc.slug = await uniqueSlug(doc.title);
    if (req.files && req.files.poster) doc.poster = '/uploads/posters/' + req.files.poster[0].filename;
    if (req.files && req.files.backdrop) doc.backdrop = '/uploads/backdrops/' + req.files.backdrop[0].filename;
    if (req.files && req.files.screenshots) doc.screenshots = req.files.screenshots.slice(0, 4).map((file) => '/uploads/screenshots/' + file.filename);
    await Movie.create(doc);
    req.session.flash = { type: 'success', message: 'Movie added successfully.' };
    res.redirect('/admin/movies');
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
    res.redirect('/admin/movies/new');
  }
};

exports.updateMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).render('error', { title: 'Not Found', message: 'Movie not found.', status: 404 });
    const doc = buildMovieDoc(req.body);
    if (!doc.slug) delete doc.slug;
    if (req.files && req.files.poster) doc.poster = '/uploads/posters/' + req.files.poster[0].filename;
    if (req.files && req.files.backdrop) doc.backdrop = '/uploads/backdrops/' + req.files.backdrop[0].filename;
    if (req.files && req.files.screenshots) doc.screenshots = req.files.screenshots.slice(0, 4).map((file) => '/uploads/screenshots/' + file.filename);
    else doc.screenshots = movie.screenshots || [];
    Object.assign(movie, doc);
    await movie.save();
    req.session.flash = { type: 'success', message: 'Movie updated successfully.' };
    res.redirect('/admin/movies');
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
    res.redirect(`/admin/movies/${req.params.id}/edit`);
  }
};

exports.deleteMovie = async (req, res, next) => {
  try {
    await Movie.findByIdAndDelete(req.params.id);
    req.session.flash = { type: 'success', message: 'Movie deleted.' };
    res.redirect('/admin/movies');
  } catch (err) {
    next(err);
  }
};

exports.getEditMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).render('error', { title: 'Not Found', message: 'Movie not found.', status: 404 });
    res.render('admin/edit-movie', { title: 'Edit Movie', movie });
  } catch (err) {
    next(err);
  }
};

// ---------- REST API ----------

exports.apiList = async (req, res, next) => {
  if (!db.isConnected()) return res.json({ success: true, total: 0, page: 1, limit: 20, results: [] });
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const filter = buildFilter(req.query, { onlyPublished: req.query.all !== '1' });
    const movies = await Movie.find(filter)
      .sort(sortOption(req.query.sort))
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v');
    const total = await Movie.countDocuments(filter);
    res.json({ success: true, total, page, limit, results: movies });
  } catch (err) {
    next(err);
  }
};

exports.apiSearch = async (req, res, next) => {
  if (!db.isConnected()) return res.json({ success: true, query: req.query.q || '', results: [] });
  try {
    const q = req.query.q || '';
    const movies = await Movie.find(buildFilter({ q })).sort({ rating: -1 }).limit(50).select('-__v');
    res.json({ success: true, query: q, results: movies });
  } catch (err) {
    next(err);
  }
};

exports.apiGet = async (req, res, next) => {
  if (!db.isConnected()) return res.status(503).json({ success: false, message: 'Database offline' });
  try {
    const movie = await findBySlugOrId(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });
    res.json({ success: true, result: movie });
  } catch (err) {
    next(err);
  }
};

exports.apiCreate = async (req, res, next) => {
  try {
    const doc = buildMovieDoc(req.body);
    doc.slug = await uniqueSlug(doc.title);
    const movie = await Movie.create(doc);
    res.status(201).json({ success: true, result: movie });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.apiUpdate = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });
    const doc = buildMovieDoc(req.body);
    if (!doc.slug) delete doc.slug;
    Object.assign(movie, doc);
    await movie.save();
    res.json({ success: true, result: movie });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.apiDelete = async (req, res, next) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
