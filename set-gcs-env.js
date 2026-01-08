/**
 * This script sets environment variables for Google Cloud Storage testing
 * and then runs the test script.
 * 
 * IMPORTANT: Before running this script:
 * 1. Replace 'your-project-id' below with your actual Google Cloud project ID
 *    (You can find this in the Google Cloud Console at the top of the page)
 * 2. Make sure your service account key file is saved at './keys/service-account-key.json'
 * 
 * Usage:
 * node set-gcs-env.js
 */

// Replace these values with your actual GCS configuration
process.env.GCS_PROJECT_ID = 'your-project-id'; // Replace with your actual project ID
process.env.GCS_KEY_FILE = './keys/service-account-key.json'; // Path to your key file
process.env.GCS_BUCKET_NAME = 'focus-ritual-files'; // Your bucket name

console.log('Environment variables set:');
console.log(`GCS_PROJECT_ID: ${process.env.GCS_PROJECT_ID}`);
console.log(`GCS_KEY_FILE: ${process.env.GCS_KEY_FILE}`);
console.log(`GCS_BUCKET_NAME: ${process.env.GCS_BUCKET_NAME}`);

// Now run the test script
require('./src/tests/gcs-test.js');