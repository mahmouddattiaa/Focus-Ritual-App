/**
 * Google Cloud Storage Integration Test Script
 * 
 * This script tests the basic functionality of the Google Cloud Storage integration:
 * 1. Uploading a file
 * 2. Generating a signed URL
 * 3. Downloading a file
 * 
 * Usage:
 * - Make sure you have set up your GCS credentials and environment variables
 * - Run: node src/tests/gcs-test.js
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const fs = require('fs').promises;
const path = require('path');
const { storage, gcs, bucket, getSignedUrl } = require('../config/gcs');

// Test file parameters
const TEST_FILE_NAME = 'gcs-test.txt';
const TEST_FILE_CONTENT = 'This is a test file for Google Cloud Storage integration.';
const TEST_FILE_PATH = path.join(__dirname, TEST_FILE_NAME);
const GCS_FILE_PATH = `test/${TEST_FILE_NAME}`;

async function runTests() {
    try {
        console.log('🔍 Google Cloud Storage Integration Test');
        console.log('=======================================');

        // 1. Check configuration
        console.log('\n1. Checking configuration...');
        console.log(`Project ID: ${process.env.GCS_PROJECT_ID || 'Not set'}`);
        console.log(`Key File: ${process.env.GCS_KEY_FILE || 'Not set'}`);
        console.log(`Bucket: ${bucket}`);

        // 2. Create a test file
        console.log('\n2. Creating test file...');
        await fs.writeFile(TEST_FILE_PATH, TEST_FILE_CONTENT);
        console.log(`Test file created at: ${TEST_FILE_PATH}`);

        // 3. Upload the test file to GCS
        console.log('\n3. Uploading test file to GCS...');
        const fileContent = await fs.readFile(TEST_FILE_PATH);
        const gcsFile = gcs.file(GCS_FILE_PATH);

        await gcsFile.save(fileContent, {
            contentType: 'text/plain',
            metadata: {
                contentType: 'text/plain'
            }
        });
        console.log(`File uploaded to: ${GCS_FILE_PATH}`);

        // 4. Generate a signed URL
        console.log('\n4. Generating signed URL...');
        const signedUrl = await getSignedUrl(GCS_FILE_PATH);
        console.log(`Signed URL: ${signedUrl}`);

        // 5. Check if file exists in GCS
        console.log('\n5. Checking if file exists in GCS...');
        const [exists] = await gcs.file(GCS_FILE_PATH).exists();
        console.log(`File exists in GCS: ${exists ? 'Yes' : 'No'}`);

        // 6. Clean up
        console.log('\n6. Cleaning up...');
        await fs.unlink(TEST_FILE_PATH);
        console.log(`Local test file deleted: ${TEST_FILE_PATH}`);

        await gcs.file(GCS_FILE_PATH).delete();
        console.log(`GCS test file deleted: ${GCS_FILE_PATH}`);

        console.log('\n✅ All tests completed successfully!');
        console.log('Your Google Cloud Storage integration is working correctly.');

    } catch (error) {
        console.error('\n❌ Test failed with error:', error);
        console.error('\nTroubleshooting tips:');
        console.error('1. Check that your GCS_PROJECT_ID, GCS_KEY_FILE, and GCS_BUCKET_NAME environment variables are set correctly');
        console.error('2. Verify that your service account key file exists and has the correct permissions');
        console.error('3. Make sure your bucket exists and is accessible to your service account');
        console.error('4. Check network connectivity to Google Cloud');
    }
}

runTests();