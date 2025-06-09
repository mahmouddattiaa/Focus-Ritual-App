const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
const path = require('path');

// Configure dotenv with explicit path
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const authRoutes = require('./routes/auth.routes');
const configurePassport = require('./config/passport');
const uploadRoutes = require('./routes/upload');
const settingsRoutes = require('./routes/settings.route');
// Debug environment variables
console.log("Environment variables:");
console.log("PORT:", process.env.PORT);
console.log("MONGO_URI:", process.env.MONGO_URI);
console.log("JWT_SECRET:", process.env.JWT_SECRET);

const app = express();

// Configure CORS with specific options
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Add your frontend URLs
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware with options
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
configurePassport();

app.use('/api/auth', authRoutes);
app.use('/api/up', uploadRoutes);
app.use('/api/update', settingsRoutes);

// Use a fallback for MongoDB URI
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/moneyyy';
console.log("Using MongoDB URI:", mongoURI);

mongoose.connect(mongoURI).then(() => {
        console.log('Connected to MongoDB successfully!');
    })
    .catch((err) => {
        console.log('Database connection failed:', err);
        process.exit(1);
    });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});