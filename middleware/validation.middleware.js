// middleware/validation.middleware.js - Input Validation & Sanitization
const { AppError } = require('../utils/error');

const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
};

exports.validateRegister = (req, res, next) => {
  try {
    let { username, email, password } = req.body;

    username = sanitizeString(username);
    email = sanitizeString(email);

    const errors = [];

    if (!username || username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (username && username.length > 50) {
      errors.push('Username must not exceed 50 characters');
    }

    if (!email) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Please provide a valid email address');
      }
    }

    if (!password) {
      errors.push('Password is required');
    } else if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!(hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar)) {
        errors.push('Password must contain uppercase, lowercase, number, and special character');
      }
    }

    if (errors.length > 0) {
      throw new AppError(errors.join(', '), 400);
    }

    req.body.username = username;
    req.body.email = email.toLowerCase();

    next();
  } catch (error) {
    next(error);
  }
};

exports.validateLogin = (req, res, next) => {
  try {
    let { email, password } = req.body;

    email = sanitizeString(email);

    const errors = [];

    if (!email) {
      errors.push('Email is required');
    }

    if (!password) {
      errors.push('Password is required');
    }

    if (errors.length > 0) {
      throw new AppError(errors.join(', '), 400);
    }

    req.body.email = email.toLowerCase();

    next();
  } catch (error) {
    next(error);
  }
};

exports.validateTask = (req, res, next) => {
  try {
    let { title, description, status, priority } = req.body;

    title = sanitizeString(title);
    description = sanitizeString(description);

    const errors = [];

    if (req.method === 'POST' && !title) {
      errors.push('Task title is required');
    }

    if (title && title.length > 200) {
      errors.push('Title must not exceed 200 characters');
    }

    if (description && description.length > 2000) {
      errors.push('Description must not exceed 2000 characters');
    }

    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (status && !validStatuses.includes(status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new AppError(errors.join(', '), 400);
    }

    if (title) req.body.title = title;
    if (description) req.body.description = description;

    next();
  } catch (error) {
    next(error);
  }
};

exports.validateQueryParams = (req, res, next) => {
  try {
    const { page, limit, status, priority } = req.query;
    const errors = [];

    if (page && (isNaN(page) || parseInt(page) < 1)) {
      errors.push('Page must be a positive number');
    }

    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
      errors.push('Limit must be between 1 and 100');
    }

    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (status && !validStatuses.includes(status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new AppError(errors.join(', '), 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};