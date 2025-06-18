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