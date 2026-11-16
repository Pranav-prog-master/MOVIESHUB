const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Permissions granted per role
const ROLE_PERMISSIONS = {
  user:  ['browse', 'search', 'view_movie'],
  admin: ['browse', 'search', 'view_movie', 'manage_movies', 'manage_genres', 'view_users', 'manage_users', 'manage_settings']
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE   = /^https?:\/\/.+/i;
const NAME_RE  = /^[\p{L}\p{M} '\-]+$/u;   // letters (any script), spaces, apostrophes, hyphens

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required.'],
    trim: true,
    minlength: [2,  'Name must be at least 2 characters.'],
    maxlength: [50, 'Name must be 50 characters or fewer.'],
    validate: {
      validator: v => NAME_RE.test(v),
      message:   'Name may only contain letters, spaces, hyphens and apostrophes.'
    }
  },

  email: {
    type: String,
    required:  [true, 'Email is required.'],
    unique:    true,
    lowercase: true,
    trim:      true,
    maxlength: [254, 'Email must be 254 characters or fewer.'],
    validate: {
      validator: v => EMAIL_RE.test(v),
      message:   'Please enter a valid email address.'
    }
  },

  password: {
    type: String,
    required:  [true, 'Password is required.'],
    minlength: [6,   'Password must be at least 6 characters.'],
    maxlength: [128, 'Password must be 128 characters or fewer.']
  },

  role: {
    type:    String,
    enum:    { values: ['user', 'admin'], message: 'Role must be "user" or "admin".' },
    default: 'user'
  },

  uploadedLinks: [
    {
      label: {
        type:      String,
        trim:      true,
        default:   '',
        maxlength: [100, 'Link label must be 100 characters or fewer.']
      },
      url: {
        type:     String,
        trim:     true,
        required: [true, 'Link URL is required.'],
        maxlength:[2048, 'URL must be 2048 characters or fewer.'],
        validate: {
          validator: v => URL_RE.test(v),
          message:   'Link URL must start with http:// or https://'
        }
      },
      addedAt: { type: Date, default: Date.now }
    }
  ],

  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving (only when it changed).
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.hasPermission = function (action) {
  return (ROLE_PERMISSIONS[this.role] || []).includes(action);
};

// Returns the first validation error message as a plain string.
// Usage: User.firstError(err)  →  "Email is required."
userSchema.statics.firstError = function (err) {
  if (err.name !== 'ValidationError') return err.message;
  const key = Object.keys(err.errors)[0];
  return err.errors[key].message;
};

userSchema.statics.ROLE_PERMISSIONS = ROLE_PERMISSIONS;

module.exports = mongoose.model('User', userSchema);
