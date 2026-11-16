const express = require('express');
const router = express.Router();
const c = require('../controllers/authController');
const { apiLimiter } = require('../middleware/rateLimit');

// ---------- Web pages ----------
router.get('/login', c.getLogin);
router.get('/register', c.getRegister);
router.post('/register', c.register);
router.post('/login', c.login);
router.get('/logout', c.logout);
router.get('/settings', c.getSettings);
router.post('/settings/profile', c.updateProfile);
router.post('/settings/password', c.updatePassword);
router.get('/profile', c.getProfile);

// ---------- REST API ----------
router.post('/api/auth/register', apiLimiter, c.apiRegister);
router.post('/api/auth/login', apiLimiter, c.apiLogin);
router.post('/api/auth/logout', c.apiLogout);
router.get('/api/auth/me', c.apiMe);

module.exports = router;
