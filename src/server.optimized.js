/**
 * Focus Ritual Backend Server
 * Main entry point with optimized structure
 */

// Core dependencies
const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const cors = require("cors");
const path = require("path");
const http = require("http");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

// Configuration
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const configurePassport = require("./config/passport");
const gcsConfig = require("./config/gcs");

// Middleware
const { errorHandler, notFound } = require("./middleware/errorHandler");
const logger = require("./utils/logger");

// Models
const User = require("./models/user.model");
const Message = require("./models/messages.model");
const notification = require("./models/notification.model");

// Routes
const authRoutes = require("./routes/auth.routes");
const uploadRoutes = require("./routes/upload");
const settingsRoutes = require("./routes/settings.route");
const dashboardRoutes = require("./routes/dashboard.routes");
const libraryRoutes = require("./routes/library.routes");
const geminiRoutes = require("./routes/gemini.routes");
const aiRoutes = require("./routes/ai.routes");
const subjectRoutes = require("./routes/subject.routes");
const friendRoutes = require("./routes/friends.routes");
const messageRoutes = require("./routes/message.route");
const feedRoutes = require("./routes/feed.routes");
const noteRoutes = require("./routes/note.routes");
const flashcardRoutes = require("./routes/flashcard.routes");
const qaRoutes = require("./routes/qa.routes");
const learningPathRoutes = require("./routes/learning-path.routes");

// Services
require("./services/achievement.service");
const habitResetJob = require("./controllers/scheduler");

// ============================================
// SERVER INITIALIZATION
// ============================================

const app = express();
const server = http.createServer(app);

// ============================================
// SOCKET.IO CONFIGURATION
// ============================================

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:3000",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  },
  transports: ["websocket", "polling"],
});

app.set("io", io);

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// CORS Configuration
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Passport Configuration
app.use(passport.initialize());
configurePassport();

// Request logging in development
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.http(req.method, req.path, res.statusCode, duration);
    });
    next();
  });
}

// ============================================
// API ROUTES
// ============================================

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/update", settingsRoutes);
app.use("/api/stats", dashboardRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/gemini", geminiRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/qa-sessions", qaRoutes);
app.use("/api/learning-paths", learningPathRoutes);

// Upload routes (with and without /api prefix for compatibility)
app.use("/api/up", uploadRoutes);
app.use("/up", uploadRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ============================================
// DATABASE CONNECTION
// ============================================

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  logger.error(
    "FATAL ERROR: MONGO_URI is not defined in environment variables"
  );
  process.exit(1);
}

mongoose
  .connect(mongoURI)
  .then(() => {
    logger.success("✓ Connected to MongoDB successfully");
  })
  .catch((err) => {
    logger.error("✗ Database connection failed:", err);
    process.exit(1);
  });

// After database connection established
mongoose.connection.once("open", async () => {
  logger.success("✓ MongoDB database connection established");

  // Verify Google Cloud Storage
  const gcsConnected = await gcsConfig.verifyConnection();
  if (gcsConnected) {
    logger.success("✓ Google Cloud Storage configured and ready");
  } else {
    logger.warn(
      "⚠ WARNING: Google Cloud Storage not configured. Using MongoDB only."
    );
  }

  // Start server
  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => {
    logger.success(`✓ Server is running on port: ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    logger.info(`API available at: http://localhost:${PORT}/api`);
  });
});

// ============================================
// SOCKET.IO EVENT HANDLERS
// ============================================

const jwt = require("jsonwebtoken");

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const authHeader = socket.handshake.headers.authorization;
    const tokenFromAuth = socket.handshake.auth.token;

    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : tokenFromAuth;

    if (!token) {
      return next(new Error("Authentication error: Token not found"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    socket.user = user;
    next();
  } catch (err) {
    logger.error("Socket authentication error:", err);
    next(new Error("Authentication error"));
  }
});

// Connection tracking
const connectedUsers = new Map();
const activeChats = new Map();
const rooms = {};
const socketToRoom = {};

// Socket connection handler
io.on("connection", async (socket) => {
  const userId = socket.user._id.toString();
  logger.info(`User connected: ${userId} (${socket.id})`);

  // Join user's personal room
  socket.join(userId);

  // Track connected users
  if (!connectedUsers.has(userId)) {
    connectedUsers.set(userId, new Set());
    await User.findByIdAndUpdate(userId, { online: true });
  }
  connectedUsers.get(userId).add(socket.id);

  // ========== COLLABORATION ROOM EVENTS ==========

  socket.on("joinRoom", ({ roomCode, user }) => {
    socket.join(roomCode);
    socketToRoom[socket.id] = roomCode;

    if (!rooms[roomCode]) {
      rooms[roomCode] = { participants: [], messages: [] };
    }

    if (!rooms[roomCode].participants.some((p) => p.id === user.id)) {
      rooms[roomCode].participants.push(user);
    }

    socket.emit("roomState", rooms[roomCode]);
    socket.to(roomCode).emit("userJoined", user);

    logger.info(`User ${user.name} joined room ${roomCode}`);
  });

  socket.on("sendMessage", (message) => {
    const roomCode = socketToRoom[socket.id];
    if (roomCode && rooms[roomCode]) {
      rooms[roomCode].messages.push(message);
      io.to(roomCode).emit("newMessage", message);
    }
  });

  socket.on("addReaction", (data) => {
    const roomCode = socketToRoom[socket.id];
    if (roomCode) {
      io.to(roomCode).emit("reactionAdded", data);
    }
  });

  socket.on("setTyping", (data) => {
    const roomCode = socketToRoom[socket.id];
    if (roomCode) {
      socket.to(roomCode).emit("typingStatusChanged", data);
    }
  });

  // ========== PRIVATE MESSAGING EVENTS ==========

  socket.on("private_message", async (data) => {
    try {
      const { recipientId, content } = data;
      const senderId = socket.user._id;

      const recipientIsViewing =
        activeChats.get(recipientId) === senderId.toString();

      const message = new Message({
        sender: senderId,
        recipient: recipientId,
        content: content,
        read: recipientIsViewing,
      });

      await message.save();

      const messagePayload = message.toObject();

      // Send to both parties
      io.to(recipientId).emit("new_private_message", messagePayload);
      io.to(senderId.toString()).emit("new_private_message", messagePayload);

      // Send notification if recipient not viewing
      if (!recipientIsViewing) {
        const user = await User.findById(senderId);
        const notif = new notification({
          userId: recipientId,
          title: `New message from ${user.firstName}`,
          description: message.content,
        });
        await notif.save();
        io.to(recipientId).emit("notification:message", notif);
      }
    } catch (error) {
      logger.error("Error handling private message:", error);
    }
  });

  socket.on("open chat", async (data) => {
    try {
      const { friendId } = data;
      activeChats.set(userId, friendId);

      await Message.updateMany(
        { recipient: userId, sender: friendId, read: false },
        { $set: { read: true } }
      );

      io.to(friendId).emit("seen_message", { readerId: userId });
    } catch (error) {
      logger.error("Error opening chat:", error);
    }
  });

  socket.on("close chat", () => {
    activeChats.delete(userId);
  });

  // ========== NOTIFICATION EVENTS ==========

  socket.on("open_notifications", async () => {
    try {
      await notification.updateMany(
        { userId: userId, isRead: false },
        { $set: { isRead: true } }
      );
    } catch (error) {
      logger.error("Error marking notifications as read:", error);
    }
  });

  // ========== DISCONNECT HANDLER ==========

  socket.on("disconnect", async () => {
    logger.info(`User disconnected: ${userId} (${socket.id})`);

    activeChats.delete(userId);

    // Track user online status
    if (connectedUsers.has(userId)) {
      connectedUsers.get(userId).delete(socket.id);
      if (connectedUsers.get(userId).size === 0) {
        connectedUsers.delete(userId);
        await User.findByIdAndUpdate(userId, { online: false });
      }
    }

    // Remove from collaboration room
    const roomCode = socketToRoom[socket.id];
    if (roomCode && rooms[roomCode]) {
      const user = rooms[roomCode].participants.find((p) => p.id === socket.id);
      if (user) {
        rooms[roomCode].participants = rooms[roomCode].participants.filter(
          (p) => p.id !== socket.id
        );
        socket.to(roomCode).emit("userLeft", {
          userId: socket.id,
          name: user.name,
        });
      }
    }
    delete socketToRoom[socket.id];
  });
});

// ============================================
// ACHIEVEMENT SYSTEM
// ============================================

function emitAchievementUnlocked(userId, notif) {
  if (io) {
    io.to(userId.toString()).emit("notification:achievement:unlocked", {
      notif,
    });
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = () => {
  logger.info("Shutdown signal received. Closing server gracefully...");

  // Stop scheduled jobs
  habitResetJob.stop();

  // Close server
  server.close(() => {
    logger.success("Server closed");
    mongoose.connection.close(false, () => {
      logger.success("Database connection closed");
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("SIGUSR2", gracefulShutdown);

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down...", err);
  server.close(() => {
    process.exit(1);
  });
});

// Export for external use
module.exports = { emitAchievementUnlocked };
