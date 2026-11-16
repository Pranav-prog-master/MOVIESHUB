const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const User = require('../models/User');
const Genre = require('../models/Genre');
const fs = require('fs');
const path = require('path');
const c = require('../controllers/movieController');
const ensureAdmin = require('../middleware/admin');
const { uploadMovie, handleUploadError, UPLOAD_ROOT } = require('../middleware/upload');

router.use(ensureAdmin);

// ---------- Dashboard ----------
router.get('/', async (req, res, next) => {
  try {
    const [totalMovies, totalUsers, totalWatchLinks, totalPosters] = await Promise.all([
      Movie.countDocuments(),
      User.countDocuments(),
      Movie.countDocuments({ watchUrl: { $ne: '' } }),
      Movie.countDocuments({ poster: { $ne: '' } })
    ]);
    res.render('admin/dashboard', {
      title: 'XP Admin — XP Control Center',
      stats: { totalMovies, totalUsers, totalCategories: 5, totalWatchLinks, totalPosters }
    });
  } catch (err) {
    next(err);
  }
});

// ---------- Movies table + CRUD ----------
router.get('/movies', async (req, res, next) => {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 }).select('title releaseYear category status poster');
    res.render('admin/movies', { title: 'Manage Movies', movies });
  } catch (err) {
    next(err);
  }
});

router.get('/movies/new', (req, res) => res.render('admin/add-movie', { title: 'Add Movie' }));

router.post('/movies', uploadMovie, handleUploadError, c.createMovie);
router.get('/movies/:id/edit', c.getEditMovie);
router.post('/movies/:id', uploadMovie, handleUploadError, c.updateMovie);
router.post('/movies/:id/delete', c.deleteMovie);

// ---------- Genres ----------
router.get('/genres', async (req, res, next) => {
  try {
    const genres = await Genre.find().sort({ name: 1 });
    res.render('admin/genres', { title: 'Genres', genres });
  } catch (err) {
    next(err);
  }
});

router.post('/genres', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      req.session.flash = { type: 'error', message: 'Genre name required.' };
      return res.redirect('/admin/genres');
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await Genre.findOneAndUpdate({ name }, { name, slug }, { upsert: true, new: true });
    req.session.flash = { type: 'success', message: 'Genre saved.' };
    res.redirect('/admin/genres');
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
    res.redirect('/admin/genres');
  }
});

router.post('/genres/:id/delete', async (req, res, next) => {
  try {
    await Genre.findByIdAndDelete(req.params.id);
    req.session.flash = { type: 'success', message: 'Genre deleted.' };
    res.redirect('/admin/genres');
  } catch (err) {
    next(err);
  }
});

// ---------- Users ----------
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const totalLinks = users.reduce((sum, u) => sum + (u.uploadedLinks?.length || 0), 0);
    const totalAdmins = users.filter(u => u.role === 'admin').length;
    res.render('admin/users', { title: 'Users', users, totalLinks, totalAdmins });
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/role', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.redirect('/admin/users');
    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();
    req.session.flash = { type: 'success', message: `${user.name} is now ${user.role}.` };
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/links', async (req, res, next) => {
  try {
    const { label, url } = req.body;
    if (!url || !url.trim()) {
      req.session.flash = { type: 'error', message: 'URL is required.' };
      return res.redirect('/admin/users');
    }
    await User.findByIdAndUpdate(req.params.id, {
      $push: { uploadedLinks: { label: (label || '').trim(), url: url.trim(), addedAt: new Date() } }
    });
    req.session.flash = { type: 'success', message: 'Link added.' };
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/links/:idx/delete', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.redirect('/admin/users');
    user.uploadedLinks.splice(Number(req.params.idx), 1);
    await user.save();
    req.session.flash = { type: 'success', message: 'Link removed.' };
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
});

// ---------- Posters (browse uploaded files) ----------
router.get('/posters', (req, res) => {
  const dir = path.join(UPLOAD_ROOT, 'posters');
  let files = [];
  try {
    files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => !f.startsWith('.')) : [];
  } catch (_) {}
  res.render('admin/posters', { title: 'Posters', files });
});

// ---------- Watch links ----------
router.get('/watch-links', async (req, res, next) => {
  try {
    const movies = await Movie.find({ watchUrl: { $ne: '' } }).select('title watchUrl downloadUrl sources');
    res.render('admin/watch-links', { title: 'Watch Links', movies });
  } catch (err) {
    next(err);
  }
});

// ---------- Settings ----------
router.get('/settings', (req, res) => {
  res.render('admin/settings', {
    title: 'Settings',
    tmdbConfigured: Boolean(process.env.TMDB_API_KEY),
    dbUri: process.env.MONGODB_URI ? '(custom)' : '(in-memory)'
  });
});

module.exports = router;
