const User = require('../models/User');

function publicUser(u) {
  return { id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
}

exports.getLogin = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { title: 'Login' });
};

exports.getRegister = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register', { title: 'Register' });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role: requestedRole, adminSecret } = req.body;
    console.log('[register] attempt — email:', email, '| requested role:', requestedRole);

    if (!name || !email || !password) {
      req.session.flash = { type: 'error', message: 'Name, email and password are required.' };
      return res.redirect('/register');
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      console.log('[register] email already exists:', email);
      req.session.flash = { type: 'error', message: 'An account with that email already exists.' };
      return res.redirect('/register');
    }

    const count = await User.countDocuments();
    console.log('[register] total users in DB:', count);
    let role = 'user';
    if (count === 0) {
      role = 'admin';
      console.log('[register] first user — auto-promoted to admin');
    } else if (requestedRole === 'admin') {
      const secret = process.env.ADMIN_REGISTER_SECRET;
      if (!secret || adminSecret !== secret) {
        console.log('[register] invalid admin secret provided');
        req.session.flash = { type: 'error', message: 'Invalid admin secret.' };
        return res.redirect('/register');
      }
      role = 'admin';
    }

    const user = await User.create({ name, email, password, role });
    console.log('[register] created user:', user.email, '| role:', user.role);
    req.session.user = publicUser(user);
    req.session.flash = {
      type: 'success',
      message: role === 'admin' ? 'Admin account created. Welcome to XP Movies!' : 'Account created. Welcome to XP Movies!'
    };
    res.redirect(role === 'admin' ? '/admin' : '/');
  } catch (err) {
    console.error('[register] error:', err.message);
    req.session.flash = { type: 'error', message: User.firstError(err) };
    res.redirect('/register');
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, role: selectedRole } = req.body;
    console.log('[login] attempt — email:', email, '| selected role:', selectedRole);

    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) {
      console.log('[login] no user found for email:', email);
      req.session.flash = { type: 'error', message: 'Invalid email or password.' };
      return res.redirect('/login');
    }

    const passwordMatch = await user.comparePassword(password || '');
    if (!passwordMatch) {
      console.log('[login] wrong password for:', email);
      req.session.flash = { type: 'error', message: 'Invalid email or password.' };
      return res.redirect('/login');
    }

    if (selectedRole && selectedRole !== user.role) {
      console.log('[login] role mismatch — selected:', selectedRole, '| actual:', user.role);
      req.session.flash = { type: 'error', message: `This account is not registered as ${selectedRole}. Your role is "${user.role}".` };
      return res.redirect('/login');
    }

    console.log('[login] success — email:', user.email, '| role:', user.role);
    req.session.user = publicUser(user);
    const returnTo = req.session.returnTo;
    delete req.session.returnTo;
    if (returnTo) return res.redirect(returnTo);
    res.redirect(user.role === 'admin' ? '/admin' : '/');
  } catch (err) {
    console.error('[login] error:', err.message);
    next(err);
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/'));
};

exports.getSettings = (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('settings', { title: 'Settings' });
};

exports.getProfile = (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('profile', { title: 'My Profile' });
};

exports.updateProfile = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.session.user.id);
    if (!user) return res.redirect('/login');
    user.name  = name;
    user.email = email;
    await user.save();
    req.session.user = publicUser(user);
    req.session.flash = { type: 'success', message: 'Profile updated successfully.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: User.firstError(err) };
  }
  res.redirect('/settings');
};

exports.updatePassword = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      req.session.flash = { type: 'error', message: 'New passwords do not match.' };
      return res.redirect('/settings');
    }
    const user = await User.findById(req.session.user.id);
    if (!user) return res.redirect('/login');
    const ok = await user.comparePassword(currentPassword || '');
    if (!ok) {
      req.session.flash = { type: 'error', message: 'Current password is incorrect.' };
      return res.redirect('/settings');
    }
    user.password = newPassword;
    await user.save();
    req.session.flash = { type: 'success', message: 'Password updated successfully.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: User.firstError(err) };
  }
  res.redirect('/settings');
};

// ---------- API ----------

exports.apiRegister = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }
    const role = (await User.countDocuments()) === 0 ? 'admin' : 'user';
    const user = await User.create({ name, email, password, role });
    res.status(201).json({ success: true, user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ success: false, message: User.firstError(err) });
  }
};

exports.apiLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await user.comparePassword(password || ''))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    req.session.user = publicUser(user);
    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.apiLogout = (req, res) => {
  req.session.destroy(() => res.json({ success: true, message: 'Logged out.' }));
};

exports.apiMe = (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Not authenticated.' });
  res.json({ success: true, user: req.session.user });
};
