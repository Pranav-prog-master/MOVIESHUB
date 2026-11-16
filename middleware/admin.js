// Requires an admin session for web pages; returns 403 JSON for API routes.
module.exports = function ensureAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  req.session.flash = { type: 'error', message: 'Admin access required.' };
  return res.redirect('/');
};
