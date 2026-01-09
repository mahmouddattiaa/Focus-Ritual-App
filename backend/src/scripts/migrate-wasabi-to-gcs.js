/**
 * Migration Script: Wasabi to Google Cloud Storage
 * 
 * This script migrates files from Wasabi to Google Cloud Storage.
 * It reads files from Wasabi and uploads them to GCS with the same keys.
 * 
 * Usage:
 * - node src/scripts/migrate-wasabi-to-gcs.js --wasabi-key=YOUR_WASABI_KEY --wasabi-secret=YOUR_WASABI_SECRET --gcs-project=YOUR_GCS_PROJECT_ID
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const AWS = require('aws-sdk');
const { Storage } = require('@google-cloud/storage');

// Parse command line arguments
const args = {};
process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        args[key] = value;
    }
});

// Set environment variables from command line arguments or defaults
const wasabiAccessKey = args['wasabi-key'] || process.env.WASABI_ACCESS_KEY;
const wasabiSecretKey = args['wasabi-secret'] || process.env.WASABI_SECRET_KEY;
const gcsProjectId = args['gcs-project'] || process.env.GCS_PROJECT_ID || 'your-project-id';
const gcsKeyFile = args['gcs-key'] || process.env.GCS_KEY_FILE || './keys/service-account-key.json';
const gcsBucketName = args['gcs-bucket'] || process.env.GCS_BUCKET_NAME || 'focus-ritual-files';
const wasabiBucketName = args['wasabi-bucket'] || 'focus-ritual-files';

// Wasabi configuration
const wasabiConfig = {
    endpoint: 'https://s3.eu-central-1.wasabisys.com',
    accessKeyId: wasabiAccessKey,
    secretAccessKey: wasabiSecretKey
};
const s3 = new AWS.S3(wasabiConfig);
const wasabiBucket = wasabiBucketName;

// Google Cloud Storage configuration
const storage = new Storage({
    projectId: gcsProjectId,
    keyFilename: gcsKeyFile,
});
const gcsBucket = storage.bucket(gcsBucketName);

// Temporary directory for downloads
const TMP_DIR = path.join(__dirname, '../../../tmp');
if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

// List all files in Wasabi bucket
async function listWasabiFiles() {
    console.log('Listing files in Wasabi bucket...');

    try {
        const data = await s3.listObjectsV2({ Bucket: wasabiBucket }).promise();
        return data.Contents.map(item => item.Key);
    } catch (err) {
        console.error('Error listing Wasabi files:', err);
        return [];
    }
}

// Download file from Wasabi
async function downloadFromWasabi(key) {
    console.log(`Downloading from Wasabi: ${key}`);

    const localPath = path.join(TMP_DIR, path.basename(key));
    const fileStream = fs.createWriteStream(localPath);

    const params = {
        Bucket: wasabiBucket,
        Key: key
    };

    try {
        const s3Stream = s3.getObject(params).createReadStream();
        await pipeline(s3Stream, fileStream);
        console.log(`Downloaded to: ${localPath}`);
        return localPath;
    } catch (err) {
        console.error(`Error downloading file ${key}:`, err);
        return null;
    }
}

// Upload file to Google Cloud Storage
async function uploadToGCS(localPath, key) {
    console.log(`Uploading to GCS: ${key}`);

    try {
        await gcsBucket.upload(localPath, {
            destination: key,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });
        console.log(`Uploaded to GCS: ${key}`);
        return true;
    } catch (err) {
        console.error(`Error uploading file ${key} to GCS:`, err);
        return false;
    }
}

// Clean up temporary file
async function cleanupTempFile(localPath) {
    try {
        fs.unlinkSync(localPath);
        console.log(`Deleted temporary file: ${localPath}`);
    } catch (err) {
        console.error(`Error deleting temporary file ${localPath}:`, err);
    }
}

// Print usage instructions
function printUsage() {
    console.log('\nUsage:');
    console.log('node src/scripts/migrate-wasabi-to-gcs.js --wasabi-key=YOUR_WASABI_KEY --wasabi-secret=YOUR_WASABI_SECRET --gcs-project=YOUR_GCS_PROJECT_ID [options]');
    console.log('\nRequired:');
    console.log('  --wasabi-key     Wasabi access key');
    console.log('  --wasabi-secret  Wasabi secret key');
    console.log('  --gcs-project    Google Cloud project ID');
    console.log('\nOptional:');
    console.log('  --gcs-key        Path to Google Cloud service account key file (default: ./keys/service-account-key.json)');
    console.log('  --gcs-bucket     Google Cloud Storage bucket name (default: focus-ritual-files)');
    console.log('  --wasabi-bucket  Wasabi bucket name (default: focus-ritual-files)');
}

// Main migration function
async function migrateFiles() {
    try {
        console.log('Starting migration from Wasabi to Google Cloud Storage...');
        console.log('Using GCS Project ID:', gcsProjectId);
        console.log('Using GCS Key File:', gcsKeyFile);
        console.log('Using GCS Bucket:', gcsBucketName);
        console.log('Using Wasabi Bucket:', wasabiBucket);

        // Check if Wasabi credentials are set
        if (!wasabiAccessKey || !wasabiSecretKey) {
            console.error('ERROR: Wasabi credentials not provided.');
            printUsage();
            return;
        }

        // List all files in Wasabi
        const files = await listWasabiFiles();
        console.log(`Found ${files.length} files in Wasabi`);

        // Process each file
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < files.length; i++) {
            const key = files[i];
            console.log(`\nProcessing file ${i + 1}/${files.length}: ${key}`);

            // Download from Wasabi
            const localPath = await downloadFromWasabi(key);
            if (!localPath) {
                failCount++;
                continue;
            }

            // Upload to GCS
            const uploadSuccess = await uploadToGCS(localPath, key);
            if (uploadSuccess) {
                successCount++;
            } else {
                failCount++;
            }

            // Clean up
            await cleanupTempFile(localPath);
        }

        console.log('\nMigration Summary:');
        console.log(`Total files: ${files.length}`);
        console.log(`Successfully migrated: ${successCount}`);
        console.log(`Failed: ${failCount}`);

    } catch (err) {
        console.error('Migration failed:', err);
    }
}

// Check if help is requested
if (args.help || args.h) {
    printUsage();
} else {
    // Run the migration
    migrateFiles();
}