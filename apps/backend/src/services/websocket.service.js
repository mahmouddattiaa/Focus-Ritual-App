const socketIO = require('socket.io');
let io;

function initializeWebSocket(server){
    io = socketIO(server, {
        cors: {
            
            origin: ['http://localhost:5173', 'http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });
    io.on('connection', (socket) => {
        console.log('Client connected');
        
        // When that client disconnects
        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });
return io;
}

function emitAchievementUnlocked(userId, achievement) {
    if (io) {  // Check if socket.io is initialized
        // Send a message to the specific user
        io.to(userId.toString()).emit('achievement:unlocked', {
            achievement: {
                title: achievement.title,
                description: achievement.description,
                xp: achievement.xp,
                category: achievement.category
            }
        });
    }
}

module.exports = {
    initializeWebSocket,
    emitAchievementUnlocked
};