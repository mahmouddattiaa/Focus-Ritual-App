const mongoose = require('mongoose');

// Connect to your MongoDB database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Get a reference to the users collection
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Drop the index
    await collection.dropIndex('userId_1');
    console.log('Successfully dropped the userId_1 index');
  } catch (error) {
    console.error('Error dropping index:', error);
  } finally {
    // Close the connection
    mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
})
.catch(err => {
  console.error('Error connecting to MongoDB:', err);
}); 