const path = require('path');
const fs = require('fs');

// Redirect stdout and stderr to a log file
const logStream = fs.createWriteStream(path.join(__dirname, 'debug.log'), { flags: 'a' });
process.stdout.write = process.stderr.write = logStream.write.bind(logStream);

console.log('--- STARTING DEBUG SESSION ---');
console.log('Current directory:', __dirname);

try {
    // Try to load environment variables
    const envPath = path.resolve(__dirname, '../../.env');
    console.log('Attempting to load .env from:', envPath);
    require('dotenv').config({ path: envPath });
    
    console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

    // Try to require the server file (which runs the app)
    console.log('Requiring server.js...');
    require('./src/server.js');
} catch (err) {
    console.error('CRITICAL ERROR:', err);
}
