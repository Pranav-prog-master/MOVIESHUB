require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const { siteLimiter } = require('./middleware/rateLimit');
const connectDB = require('./config/database');

const movieRoutes = require('./routes/movieRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// ---------- View engine ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  })
);
app.use(siteLimiter);

// Expose session user + flash messages to all views.
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.theme = req.session.theme || 'dark';
  next();
});

// ---------- Routes ----------
app.use('/', movieRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).render('error', { title: 'Not Found', message: 'The page you are looking for does not exist.', status: 404 });
});

// ---------- Error handler ----------
app.use((err, req, res, _next) => {
  console.error('[error]', err.message);
  const status = err.status || 500;
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(status).json({ success: false, message: err.message || 'Server error' });
  }
  res.status(status).render('error', { title: 'Error', message: err.message || 'Something went wrong.', status });
});

const PORT = process.env.PORT || 3000;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n  XP Movies is running → http://localhost:${PORT}\n`);
  });
})();

module.exports = app;
