const express = require('express');
const router = express.Router();
const c = require('../controllers/movieController');
const { apiLimiter } = require('../middleware/rateLimit');
const ensureAdmin = require('../middleware/admin');
const db = require('../config/database');

// ---------- Web pages ----------
router.get('/', c.getHome);
router.get('/movies', c.getMovies);
router.get('/category/:slug', c.getByCategory);
router.get('/latest', (req, res, next) => { req.query.sort = 'year'; req.query.heading = 'Latest Movies'; c.getMovies(req, res, next); });
router.get('/popular', (req, res, next) => { req.query.sort = 'rating'; req.query.heading = 'Popular Movies'; c.getMovies(req, res, next); });
router.get('/genres', c.getGenres);
router.get('/genre/:slug', c.getByGenre);
router.get('/search', c.getSearch);
router.get('/discover', c.discover);
router.get('/movie/:id', c.getMovie);
router.get('/watch/:id', c.getWatch);

// ---------- REST API ----------
router.get('/api/movies', apiLimiter, c.apiList);
router.get('/api/suggest', apiLimiter, async (req, res, next) => {
  if (!db.isConnected()) return res.json({ success: true, results: [] });
  try {
    const Movie = require('../models/Movie');
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json({ success: true, results: [] });
    const movies = await Movie.find({
      status: 'published',
      title: { $regex: q, $options: 'i' }
    })
      .limit(8)
      .select('title slug releaseYear');
    res.json({ success: true, results: movies });
  } catch (err) {
    next(err);
  }
});
router.get('/api/movies/search', apiLimiter, c.apiSearch);
router.get('/api/movies/:id', apiLimiter, c.apiGet);
router.post('/api/movies', apiLimiter, ensureAdmin, c.apiCreate);
router.put('/api/movies/:id', apiLimiter, ensureAdmin, c.apiUpdate);
router.delete('/api/movies/:id', apiLimiter, ensureAdmin, c.apiDelete);

router.get('/api/genres', apiLimiter, async (req, res, next) => {
  if (!db.isConnected()) return res.json({ success: true, results: [] });
  try {
    const Genre = require('../models/Genre');
    const genres = await Genre.find().sort({ name: 1 });
    res.json({ success: true, results: genres });
  } catch (err) {
    next(err);
  }
});

router.get('/api/discover', apiLimiter, c.discover);

module.exports = router;
