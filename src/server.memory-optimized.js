/**
 * Memory-Optimized Server Configuration
 * Fixes memory leaks and improves performance
 */

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
// MEMORY OPTIMIZATION CONFIGURATION
// ============================================

// Configure MongoDB for optimal memory usage
mongoose.set("maxPoolSize", 10); // Limit connection pool
mongoose.set("bufferTimeoutMS", 30000); // Reduce buffer timeout

// ============================================
// SERVER INITIALIZATION
// ============================================

const app = express();
const server = http.createServer(app);

// ============================================
// SOCKET.IO WITH MEMORY OPTIMIZATIONS
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
  // MEMORY OPTIMIZATION: Limit max http buffer size
  maxHttpBufferSize: 1e6, // 1MB
  // MEMORY OPTIMIZATION: Ping timeout settings
  pingTimeout: 60000,
  pingInterval: 25000,
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
// MEMORY OPTIMIZATION: Limit payload size
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

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

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    memory: process.memoryUsage(),
    uptime: process.uptime(),
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
app.use("/api/up", uploadRoutes);
app.use("/up", uploadRoutes);

// ============================================
// ERROR HANDLING
// ============================================

app.use(notFound);
app.use(errorHandler);

// ============================================
// DATABASE CONNECTION
// ============================================

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  logger.error("FATAL ERROR: MONGO_URI is not defined");
  process.exit(1);
}

mongoose
  .connect(mongoURI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    logger.success("✓ Connected to MongoDB successfully");
  })
  .catch((err) => {
    logger.error("✗ Database connection failed:", err);
    process.exit(1);
  });

mongoose.connection.once("open", async () => {
  logger.success("✓ MongoDB database connection established");

  const gcsConnected = await gcsConfig.verifyConnection();
  if (gcsConnected) {
    logger.success("✓ Google Cloud Storage configured and ready");
  } else {
    logger.warn("⚠ WARNING: Google Cloud Storage not configured");
  }

  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => {
    logger.success(`✓ Server is running on port: ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
});

// ============================================
// MEMORY-OPTIMIZED SOCKET.IO HANDLERS
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
    const user = await User.findById(decoded.id).lean(); // MEMORY: Use lean()

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

// MEMORY OPTIMIZATION: Use WeakMap for better garbage collection
const connectedUsers = new Map();
const activeChats = new Map();
const rooms = new Map(); // Changed from object to Map
const socketToRoom = new Map(); // Changed from object to Map

// MEMORY OPTIMIZATION: Periodic cleanup of stale data
setInterval(() => {
  const now = Date.now();
  const STALE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

  // Clean up empty rooms
  for (const [roomCode, room] of rooms.entries()) {
    if (room.participants.length === 0) {
      const roomAge = now - (room.createdAt || now);
      if (roomAge > STALE_THRESHOLD) {
        rooms.delete(roomCode);
        logger.debug(`Cleaned up stale room: ${roomCode}`);
      }
    }
  }

  // Clean up stale active chats
  for (const [userId, friendId] of activeChats.entries()) {
    // If user not connected, remove from active chats
    if (!connectedUsers.has(userId)) {
      activeChats.delete(userId);
    }
  }

  logger.debug(
    `Memory cleanup: ${rooms.size} rooms, ${activeChats.size} active chats`
  );
}, 60 * 60 * 1000); // Every hour

// Socket connection handler
io.on("connection", async (socket) => {
  const userId = socket.user._id.toString();
  logger.info(`User connected: ${userId} (${socket.id})`);

  // Store reference for cleanup
  const socketEventHandlers = [];

  // Helper function to register events that will be cleaned up
  const registerEvent = (eventName, handler) => {
    socket.on(eventName, handler);
    socketEventHandlers.push(eventName);
  };

  // Join user's personal room
  socket.join(userId);

  // Track connected users
  if (!connectedUsers.has(userId)) {
    connectedUsers.set(userId, new Set());
    // MEMORY: Use updateOne instead of findByIdAndUpdate
    await User.updateOne({ _id: userId }, { online: true });
  }
  connectedUsers.get(userId).add(socket.id);

  // ========== COLLABORATION ROOM EVENTS ==========

  registerEvent("joinRoom", ({ roomCode, user }) => {
    socket.join(roomCode);
    socketToRoom.set(socket.id, roomCode);

    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, {
        participants: [],
        messages: [],
        createdAt: Date.now(), // Track creation time
      });
    }

    const room = rooms.get(roomCode);
    if (!room.participants.some((p) => p.id === user.id)) {
      room.participants.push(user);
    }

    socket.emit("roomState", room);
    socket.to(roomCode).emit("userJoined", user);

    logger.info(`User ${user.name} joined room ${roomCode}`);
  });

  registerEvent("sendMessage", (message) => {
    const roomCode = socketToRoom.get(socket.id);
    if (roomCode && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      // MEMORY OPTIMIZATION: Limit message history per room
      room.messages.push(message);
      if (room.messages.length > 100) {
        room.messages.shift(); // Remove oldest message
      }
      io.to(roomCode).emit("newMessage", message);
    }
  });

  registerEvent("addReaction", (data) => {
    const roomCode = socketToRoom.get(socket.id);
    if (roomCode) {
      io.to(roomCode).emit("reactionAdded", data);
    }
  });

  registerEvent("setTyping", (data) => {
    const roomCode = socketToRoom.get(socket.id);
    if (roomCode) {
      socket.to(roomCode).emit("typingStatusChanged", data);
    }
  });

  // ========== PRIVATE MESSAGING EVENTS ==========

  registerEvent("private_message", async (data) => {
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

      // MEMORY: Use lean() to get plain object
      const messagePayload = message.toObject();

      // Send to both parties
      io.to(recipientId).emit("new_private_message", messagePayload);
      io.to(senderId.toString()).emit("new_private_message", messagePayload);

      // Send notification if recipient not viewing
      if (!recipientIsViewing) {
        // MEMORY: Use lean() for read-only query
        const user = await User.findById(senderId).select("firstName").lean();
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

  registerEvent("open chat", async (data) => {
    try {
      const { friendId } = data;
      activeChats.set(userId, friendId);

      // MEMORY: Use updateMany more efficiently
      await Message.updateMany(
        { recipient: userId, sender: friendId, read: false },
        { $set: { read: true } }
      );

      io.to(friendId).emit("seen_message", { readerId: userId });
    } catch (error) {
      logger.error("Error opening chat:", error);
    }
  });

  registerEvent("close chat", () => {
    activeChats.delete(userId);
  });

  // ========== NOTIFICATION EVENTS ==========

  registerEvent("open_notifications", async () => {
    try {
      await notification.updateMany(
        { userId: userId, isRead: false },
        { $set: { isRead: true } }
      );
    } catch (error) {
      logger.error("Error marking notifications as read:", error);
    }
  });

  // ========== DISCONNECT HANDLER WITH PROPER CLEANUP ==========

  socket.on("disconnect", async () => {
    logger.info(`User disconnected: ${userId} (${socket.id})`);

    // MEMORY OPTIMIZATION: Remove all event listeners
    socketEventHandlers.forEach((eventName) => {
      socket.removeAllListeners(eventName);
    });

    activeChats.delete(userId);

    // Track user online status
    if (connectedUsers.has(userId)) {
      const userSockets = connectedUsers.get(userId);
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        connectedUsers.delete(userId);
        await User.updateOne({ _id: userId }, { online: false });
      }
    }

    // Remove from collaboration room
    const roomCode = socketToRoom.get(socket.id);
    if (roomCode && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      const user = room.participants.find((p) => p.id === socket.id);

      if (user) {
        room.participants = room.participants.filter((p) => p.id !== socket.id);
        socket.to(roomCode).emit("userLeft", {
          userId: socket.id,
          name: user.name,
        });
      }

      // MEMORY: Clean up empty rooms immediately
      if (room.participants.length === 0) {
        rooms.delete(roomCode);
        logger.debug(`Removed empty room: ${roomCode}`);
      }
    }

    socketToRoom.delete(socket.id);
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
// GRACEFUL SHUTDOWN WITH MEMORY CLEANUP
// ============================================

const gracefulShutdown = async () => {
  logger.info("Shutdown signal received. Cleaning up...");

  // Stop scheduled jobs
  habitResetJob.stop();

  // Close Socket.IO connections
  io.close(() => {
    logger.info("Socket.IO connections closed");
  });

  // MEMORY: Clear all maps
  connectedUsers.clear();
  activeChats.clear();
  rooms.clear();
  socketToRoom.clear();

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

// MEMORY MONITORING: Log memory usage periodically in development
if (process.env.NODE_ENV === "development") {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    logger.debug(
      `Memory Usage: RSS=${(memUsage.rss / 1024 / 1024).toFixed(2)}MB, Heap=${(
        memUsage.heapUsed /
        1024 /
        1024
      ).toFixed(2)}MB/${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`
    );
  }, 5 * 60 * 1000); // Every 5 minutes
}

module.exports = { emitAchievementUnlocked };
