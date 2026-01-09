const mongoose = require('mongoose');
const { Stats } = require('./models/stats.model.js');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB for testing'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

// Test function to check productivityByHour data
async function checkProductivityByHour() {
    try {
        // Get all users with stats
        const allStats = await Stats.find({});

        if (allStats.length === 0) {
            console.log('No stats found for any users');
            return;
        }

        console.log(`Found stats for ${allStats.length} users`);

        // Check the first user's stats
        const firstUserStats = allStats[0];
        console.log('User ID:', firstUserStats.userId);

        // Check if productivityByHour exists and has data
        if (!firstUserStats.productivityByHour || firstUserStats.productivityByHour.length === 0) {
            console.log('productivityByHour is empty or missing');
        } else {
            console.log(`productivityByHour has ${firstUserStats.productivityByHour.length} entries`);

            // Log the structure of productivityByHour
            console.log('productivityByHour structure:',
                firstUserStats.productivityByHour.map(hour => ({
                    hour: hour.hour,
                    tasksCompleted: hour.tasksCompleted,
                    focusTime: hour.focusTime,
                    productivityScore: hour.productivityScore
                }))
            );

            // Check if there's any non-zero data
            const hasData = firstUserStats.productivityByHour.some(hour =>
                hour.productivityScore > 0 || hour.focusTime > 0 || hour.tasksCompleted > 0
            );

            console.log('Has non-zero productivity data:', hasData);

            // Show hours with data
            const hoursWithData = firstUserStats.productivityByHour.filter(hour =>
                hour.productivityScore > 0 || hour.focusTime > 0 || hour.tasksCompleted > 0
            );

            console.log('Hours with data:', hoursWithData);
        }

        // Also check dailyActivity
        if (!firstUserStats.dailyActivity || firstUserStats.dailyActivity.size === 0) {
            console.log('dailyActivity is empty or missing');
        } else {
            console.log(`dailyActivity has ${firstUserStats.dailyActivity.size} entries`);
            console.log('dailyActivity data:', Object.fromEntries(firstUserStats.dailyActivity));
        }

    } catch (err) {
        console.error('Error checking productivity data:', err);
    } finally {
        // Close the connection
        mongoose.connection.close();
    }
}

// Run the test
checkProductivityByHour(); 