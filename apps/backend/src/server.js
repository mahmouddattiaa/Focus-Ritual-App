const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');

const notification = require('./models/notification.model');
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const { initializeWebSocket } = require('./services/websocket.service');
require('./services/achievement.service');
const habitResetJob = require('./controllers/scheduler');
// Configure dotenv with explicit path to root of monorepo
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const Message = require('./models/messages.model');
const authRoutes = require('./routes/auth.routes');
const configurePassport = require('./config/passport');
const uploadRoutes = require('./routes/upload');
const settingsRoutes = require('./routes/settings.route');
const dashboardRoutes = require('./routes/dashboard.routes');
const libraryRoutes = require('./routes/library.routes');
const geminiRoutes = require('./routes/gemini.routes');
const aiRoutes = require('./routes/ai.routes');
const subjectRoutes = require('./routes/subject.routes');
const friendRoutes = require('./routes/friends.routes');
const User = require('./models/user.model');
const messageRoutes = require('./routes/message.route');
const feedRoutes = require('./routes/feed.routes');
// Debug environment variables - REMOVED for security
// console.log("Environment variables:"); ...

const app = express();
const server = http.createServer(app);

// Configure CORS with dynamic origin support
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5174",
    "http://localhost:5175"
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log("Blocked by CORS:", origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS middleware with options
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
configurePassport();

// initializeWebSocket(server); // <--- REMOVED THIS DUPLICATE INITIALIZATION
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
    },
    transports: ['websocket', 'polling']
});

// API routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/update', settingsRoutes);
app.use('/api/stats', dashboardRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/friends', friendRoutes);
// Mount upload routes at both /api/up and /up for compatibility
app.use('/api/up', uploadRoutes);
app.use('/up', uploadRoutes); // Add this route for direct access without /api prefix
app.use('/api/messages', messageRoutes);
app.use('/api/feed', feedRoutes);
// Advanced learning features routes
const noteRoutes = require('./routes/note.routes');
const flashcardRoutes = require('./routes/flashcard.routes');
const qaRoutes = require('./routes/qa.routes');
const learningPathRoutes = require('./routes/learning-path.routes');
app.use('/api/notes', noteRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/qa-sessions', qaRoutes);
app.use('/api/learning-paths', learningPathRoutes);
// Use a fallback for MongoDB URI
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/moneyyy';
console.log("Using MongoDB URI:", mongoURI);

// Import GCS config with verification function
const gcsConfig = require('./config/gcs');

mongoose.connect(mongoURI).then(() => {
    console.log('Connected to MongoDB successfully!');
})
    .catch((err) => {
        console.log('Database connection failed:', err);
        process.exit(1);
    });

// After successful database connection, verify GCS connection
mongoose.connection.once('open', async () => {
    console.log('MongoDB database connection established successfully');

    // Verify Google Cloud Storage connection
    const gcsConnected = await gcsConfig.verifyConnection();
    if (gcsConnected) {
        console.log('Google Cloud Storage configured and ready');
    } else {
        console.warn('WARNING: Google Cloud Storage not configured properly. Some features may be limited.');
        console.warn('Application will continue using MongoDB only for storage.');
    }

    // Start the server after both database and storage checks
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
        console.log(`Server is running on port: ${PORT}`);
    });
});

// In-memory stores for collaboration. In production, use a persistent store like Redis.
const rooms = {}; // Using an object as a dictionary
const socketToRoom = {};

function emitAchievementUnlocked(userId, notif) {
    if (io) {
        io.to(userId.toString()).emit('notification:achievement:unlocked', {
            notif
        });
    }
}
const activeChats = new Map();

io.on('connection', async (socket) => {
    console.log('a user connected', socket.id);

    // Safety check: Ensure user is attached to socket (from middleware)
    if (!socket.user) {
        console.warn(`Socket ${socket.id} connected without authentication. Disconnecting.`);
        socket.disconnect(true);
        return;
    }

    const userId = socket.user._id.toString();
    // Collaboration room logic
    socket.on('joinRoom', ({ roomCode, user }) => {
        socket.join(roomCode);
        socketToRoom[socket.id] = roomCode;

        if (!rooms[roomCode]) {
            rooms[roomCode] = { participants: [], messages: [] };
        }

        // Add participant if not already present
        if (!rooms[roomCode].participants.some(p => p.id === user.id)) {
            rooms[roomCode].participants.push(user);
        }

        console.log(`${user.name} (${socket.id}) joined room ${roomCode}. Participants:`, rooms[roomCode].participants.length);

        // Send the current state to the joining user
        socket.emit('roomState', rooms[roomCode]);

        // Notify others in the room
        socket.to(roomCode).emit('userJoined', user);
    });

    socket.on('sendMessage', (message) => {
        const roomCode = socketToRoom[socket.id];
        if (roomCode && rooms[roomCode]) {
            rooms[roomCode].messages.push(message);
            io.to(roomCode).emit('newMessage', message);
        }
    });

    socket.on('addReaction', (data) => {
        const roomCode = socketToRoom[socket.id];
        if (roomCode) {
            io.to(roomCode).emit('reactionAdded', data);
        }
    });

    socket.on('setTyping', (data) => {
        const roomCode = socketToRoom[socket.id];
        if (roomCode) {
            socket.to(roomCode).emit('typingStatusChanged', data);
        }
    });


    // Original event handlers (if any) can be kept or merged
    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        console.log(`User ${socket.id} joined legacy room ${roomCode}`);
    });

    socket.join(userId);
    const user = await User.findById(socket.user._id);
    if (!connectedUsers.has(userId)) {

        connectedUsers.set(userId, new Set());
        await User.findByIdAndUpdate(userId, { online: true }, { new: true });

    }
    connectedUsers.get(userId).add(socket.id);


    socket.on('send_message', (data) => {
        const messageData = { ...data, sender: socket.id };
        socket.to(data.roomCode).emit('receive_message', messageData);
    });
    socket.on('open_notifications', async () => {
        await notification.updateMany({ userId: userId, isRead: false }, { $set: { isRead: true } });

    })
    socket.on('close_notifications', async () => {

    })
    socket.on('private_message', async (data) => {
        const { recipientId, content } = data; // Removed tempId
        const senderId = socket.user._id;

        const recipientIsViewing = activeChats.get(recipientId) === senderId.toString();

        const message = new Message({
            sender: senderId,
            recipient: recipientId,
            content: content,
            read: recipientIsViewing
        });

        await message.save();

        // The message object from the database is the payload.
        const messagePayload = message.toObject();

        // Send to recipient and back to sender
        io.to(recipientId).emit('new_private_message', messagePayload);
        io.to(senderId.toString()).emit('new_private_message', messagePayload);

        console.log(`Relayed message from ${senderId} to ${recipientId}`);

        // Handle notifications separately
        if (!recipientIsViewing) {
            const user = await User.findById(senderId);
            const notif = new notification({
                userId: recipientId,
                title: `new message from ${user.firstName}`,
                description: message.content,
            });
            await notif.save();
            io.to(recipientId).emit('notification:message', notif);
        }
    });
    socket.on('open chat', async (data) => {
        const { friendId } = data;
        try {
            activeChats.set(userId, friendId);
            await Message.updateMany({ recipient: userId, sender: friendId, read: false }, { $set: { read: true } });
            console.log(`message from ${friendId} to ${userId} has been read`);


            io.to(friendId).emit('seen_message', { readerId: userId });

        } catch (error) {

            console.error("error with opening chat due to :", error);
        }
    })
    socket.on('close chat', () => {

        console.log(`${userId} closed their chat window.`);

        activeChats.delete(userId);
    });
    socket.on('disconnect', async () => {
        console.log('user disconnected', socket.id);
        activeChats.delete(userId);

        if (connectedUsers.has(userId)) {
            connectedUsers.get(userId).delete(socket.id);
            if (connectedUsers.get(userId).size === 0) {
                connectedUsers.delete(userId);
                await User.findByIdAndUpdate(userId, { online: false }, { new: true });
            }
        }

        const roomCode = socketToRoom[socket.id];

        if (roomCode && rooms[roomCode]) {
            const user = rooms[roomCode].participants.find(p => p.id === socket.id);
            if (user) {
                rooms[roomCode].participants = rooms[roomCode].participants.filter(p => p.id !== socket.id);
                socket.to(roomCode).emit('userLeft', { userId: socket.id, name: user.name });
            }
        }
        delete socketToRoom[socket.id];
    });
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
process.on('SIGINT', gracefulShutdown); // For Ctrl+C in your terminal
process.on('SIGTERM', gracefulShutdown); // For standard process termination
process.on('SIGUSR2', gracefulShutdown);

// Export the function so other parts of the app can use it.
module.exports = { emitAchievementUnlocked };