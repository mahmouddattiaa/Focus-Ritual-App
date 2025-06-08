const fs = require('fs');

// Define the .env content
const envContent = `PORT=5000
MONGO_URI=mongodb://localhost:27017/moneyyy
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRES_IN=1d`;

// Write the file with UTF-8 encoding
fs.writeFileSync('.env', envContent, { encoding: 'utf8' });

console.log('.env file created successfully with UTF-8 encoding');