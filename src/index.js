const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth.routes');
const configurePassport = require('./config/passport');
const uploadRouter = require('./routes/upload');
const libraryRoutes = require('./routes/library.routes.js');
const aiRoutes = require('./routes/ai.routes');

// Import the new routes
const noteRoutes = require('./routes/note.routes');
const flashcardRoutes = require('./routes/flashcard.routes');
const qaRoutes = require('./routes/qa.routes');
const learningPathRoutes = require('./routes/learning-path.routes');

const app = express();

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', uploadRouter);
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
configurePassport();

app.use('/api/auth', authRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/ai', aiRoutes);

// Add the new routes to the app
app.use('/api/notes', noteRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/qa-sessions', qaRoutes);
app.use('/api/learning-paths', learningPathRoutes);

const mongoURI = process.env.MONGO_URI;

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