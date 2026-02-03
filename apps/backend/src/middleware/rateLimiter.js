const rateLimit = require('express-rate-limit');

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 5, 
  message: {
    message: 'Too many password reset requests from this IP, please try again after an hour'
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

module.exports ={forgotPasswordLimiter};