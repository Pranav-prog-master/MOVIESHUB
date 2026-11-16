// Requires a logged-in session for web pages; returns 401 JSON for API routes.
module.exports = function ensureAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login');
};
