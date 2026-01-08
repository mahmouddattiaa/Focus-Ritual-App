/**
 * Request Validation Middleware
 * Validates and sanitizes incoming request data
 */

const { AppError } = require("./errorHandler");

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const isValidPassword = (password) => {
  // At least 6 characters
  return password && password.length >= 6;
};

/**
 * Validate ObjectId format
 */
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitize string input (remove HTML tags, trim)
 */
const sanitizeString = (str) => {
  if (typeof str !== "string") return str;
  return str.trim().replace(/<[^>]*>/g, "");
};

/**
 * Validation rules for registration
 */
const validateRegistration = (req, res, next) => {
  const { email, firstName, lastName, password } = req.body;

  // Check required fields
  if (!email || !firstName || !lastName || !password) {
    return next(new AppError("All fields are required", 400));
  }

  // Validate email
  if (!isValidEmail(email)) {
    return next(new AppError("Please provide a valid email address", 400));
  }

  // Validate password
  if (!isValidPassword(password)) {
    return next(
      new AppError("Password must be at least 6 characters long", 400)
    );
  }

  // Validate name length
  if (firstName.length < 2 || firstName.length > 50) {
    return next(
      new AppError("First name must be between 2 and 50 characters", 400)
    );
  }

  if (lastName.length < 2 || lastName.length > 50) {
    return next(
      new AppError("Last name must be between 2 and 50 characters", 400)
    );
  }

  // Sanitize inputs
  req.body.email = sanitizeString(email.toLowerCase());
  req.body.firstName = sanitizeString(firstName);
  req.body.lastName = sanitizeString(lastName);

  next();
};

/**
 * Validation rules for login
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  if (!isValidEmail(email)) {
    return next(new AppError("Please provide a valid email address", 400));
  }

  req.body.email = sanitizeString(email.toLowerCase());

  next();
};

/**
 * Validate MongoDB ObjectId parameter
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!isValidObjectId(id)) {
      return next(new AppError(`Invalid ${paramName} format`, 400));
    }

    next();
  };
};

/**
 * Validate note creation
 */
const validateNote = (req, res, next) => {
  const { title, content } = req.body;

  if (!title || title.trim().length === 0) {
    return next(new AppError("Note title is required", 400));
  }

  if (title.length > 200) {
    return next(
      new AppError("Note title must be less than 200 characters", 400)
    );
  }

  // Sanitize inputs
  req.body.title = sanitizeString(title);
  if (content) {
    req.body.content = sanitizeString(content);
  }

  next();
};

/**
 * Validate subject creation
 */
const validateSubject = (req, res, next) => {
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return next(new AppError("Subject name is required", 400));
  }

  if (name.length > 100) {
    return next(
      new AppError("Subject name must be less than 100 characters", 400)
    );
  }

  req.body.name = sanitizeString(name);

  next();
};

/**
 * Validate file upload
 */
const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return next(new AppError("Please upload a file", 400));
  }

  // Check file size (e.g., 10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  const file = req.file || (req.files && req.files[0]);

  if (file && file.size > maxSize) {
    return next(new AppError("File size must be less than 10MB", 400));
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateObjectId,
  validateNote,
  validateSubject,
  validateFileUpload,
  sanitizeString,
  isValidEmail,
  isValidPassword,
  isValidObjectId,
};
