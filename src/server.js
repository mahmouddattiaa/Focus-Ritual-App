const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initializeWebSocket } = require('./services/websocket.service');
require('./services/achievement.service');
const habitResetJob = require('./controllers/scheduler');
// Configure dotenv with explicit path
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const authRoutes = require('./routes/auth.routes');
const configurePassport = require('./config/passport');
const uploadRoutes = require('./routes/upload');
const settingsRoutes = require('./routes/settings.route');
const dashboardRoutes = require('./routes/dashboard.routes');
const libraryRoutes = require('./routes/library.routes');

// Debug environment variables
console.log("Environment variables:");
console.log("PORT:", process.env.PORT);
console.log("MONGO_URI:", process.env.MONGO_URI);
console.log("JWT_SECRET:", process.env.JWT_SECRET);

const app = express();
const server = http.createServer(app);
initializeWebSocket(server);
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

// API routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/update', settingsRoutes);
app.use('/api/stats', dashboardRoutes);
app.use('/api/library', libraryRoutes);

// Mount upload routes at both /api/up and /up for compatibility
app.use('/api/up', uploadRoutes);
app.use('/up', uploadRoutes); // Add this route for direct access without /api prefix

// Use a fallback for MongoDB URI
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/moneyyy';
console.log("Using MongoDB URI:", mongoURI);

mongoose.connect(mongoURI).then(() => {
        console.log('Connected to MongoDB successfully!');
        console.log("Available routes:");
        console.log("  POST /api/auth/login");
        console.log("  POST /api/auth/register");
        console.log("  GET  /api/auth/me");
        console.log("  PUT  /api/update/name");
        console.log("  PUT  /api/update/bio");
        console.log("  PUT  /api/update/pfp");
        console.log("  PUT  /api/update/privacy");
        console.log("  GET  /api/stats/get");
        console.log("  GET  /api/library");
        console.log("  GET  /api/library/folder/:folderId");
        console.log("  GET  /api/library/path");
        console.log("  POST /api/library/folder");
        console.log("  POST /up/upload");
        console.log("  GET  /up/file/:id");
        console.log("  DELETE /api/library/file/:fileId");
        console.log("  DELETE /api/library/folder/:folderId");
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
const gracefulShutdown = () => {
    console.log('Shutdown signal received. Stopping scheduled jobs...');
    
    // 3. THIS IS THE LINE THAT "DELETES" THE OLD SCHEDULER
    habitResetJob.stop();
  
    // Close the web server and then exit the process
    server.close(() => {
      console.log('Server has been closed.');
      process.exit(0);
    });
  };
  
  // 4. Listen for the signals that mean "it's time to close"
  process.on('SIGINT', gracefulShutdown);  // For Ctrl+C in your terminal
  process.on('SIGTERM', gracefulShutdown); // For standard process termination
  process.on('SIGUSR2', gracefulShutdown);