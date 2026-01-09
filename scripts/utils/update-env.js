/**
 * Script to update the GCS_KEY_FILE path in the .env file
 * 
 * This script updates the GCS_KEY_FILE path to use an absolute path
 * instead of a relative path, which can sometimes cause issues.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Path to .env file
const envPath = path.resolve(__dirname, '.env');

// Read the .env file
try {
    console.log(`Reading .env file from: ${envPath}`);
    const envConfig = dotenv.parse(fs.readFileSync(envPath));

    // Get the current key file path
    const currentKeyPath = envConfig.GCS_KEY_FILE;
    console.log(`Current GCS_KEY_FILE: ${currentKeyPath}`);

    // Create absolute path
    const absoluteKeyPath = path.resolve(__dirname, currentKeyPath);
    console.log(`Absolute path: ${absoluteKeyPath}`);

    // Check if the key file exists
    if (fs.existsSync(absoluteKeyPath)) {
        console.log(`✅ Service account key file exists at: ${absoluteKeyPath}`);
    } else {
        console.error(`❌ Service account key file NOT found at: ${absoluteKeyPath}`);
        console.error('Please make sure your service account key file is in the correct location.');
        process.exit(1);
    }

    // Update the environment variables
    console.log('\nUpdating environment variables in memory...');
    process.env.GCS_KEY_FILE = absoluteKeyPath;
    console.log(`GCS_PROJECT_ID: ${process.env.GCS_PROJECT_ID}`);
    console.log(`GCS_KEY_FILE: ${process.env.GCS_KEY_FILE}`);
    console.log(`GCS_BUCKET_NAME: ${process.env.GCS_BUCKET_NAME}`);

    console.log('\nRunning test with updated environment variables...');
    require('./src/tests/gcs-test');

} catch (error) {
    console.error(`Error reading .env file: ${error.message}`);
}