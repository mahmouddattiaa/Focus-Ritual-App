const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

// Path to service account key - try environment variable first, then fallback to file
const keyFilePath = process.env.GCS_KEY_FILE || path.join(__dirname, '../../keys/service-account-key.json');

let storage;

try {
    // Check if key file exists when using file path
    if (!process.env.GCS_KEY_FILE && !fs.existsSync(keyFilePath)) {
        console.warn('GCS key file not found at:', keyFilePath);
        console.warn('Cloud storage will not be available. Please set up GCS credentials.');

        // Export a mock storage object that will log errors when used
        module.exports = {
            storage: {
                bucket: () => ({
                    file: () => ({
                        save: () => Promise.reject(new Error('GCS not configured')),
                        download: () => Promise.reject(new Error('GCS not configured')),
                        exists: () => Promise.resolve([false]),
                        delete: () => Promise.reject(new Error('GCS not configured'))
                    }),
                    exists: () => Promise.resolve([false]),
                    create: () => Promise.reject(new Error('GCS not configured'))
                }),
                isConfigured: false
            },
            verifyConnection: async () => {
                console.error('GCS not configured - connection verification skipped');
                return false;
            }
        };
    } else {
        // Initialize Google Cloud Storage
        storage = new Storage({
            keyFilename: keyFilePath,
            projectId: process.env.GCS_PROJECT_ID
        });

        // Export the properly configured storage
        module.exports = {
            storage,
            isConfigured: true,
            verifyConnection: async () => {
                try {
                    const bucketName = process.env.GCS_BUCKET || 'focus-ritual-files';

                    console.log('Verifying GCS connection...');

                    // Check if the bucket exists
                    const [bucketExists] = await storage.bucket(bucketName).exists();

                    if (!bucketExists) {
                        console.log(`Bucket '${bucketName}' does not exist, creating it...`);

                        // Create the bucket if it doesn't exist
                        await storage.createBucket(bucketName, {
                            location: process.env.GCS_LOCATION || 'us-central1',
                            storageClass: 'STANDARD',
                        });

                        console.log(`Bucket '${bucketName}' created successfully`);
                    } else {
                        console.log(`Connected to GCS bucket: ${bucketName}`);
                    }

                    return true;
                } catch (error) {
                    console.error('Error verifying GCS connection:', error);
                    return false;
                }
            }
        };
    }
} catch (error) {
    console.error('Error initializing Google Cloud Storage:', error);

    // Export a mock storage object on error
    module.exports = {
        storage: {
            bucket: () => ({
                file: () => ({
                    save: () => Promise.reject(new Error('GCS initialization failed')),
                    download: () => Promise.reject(new Error('GCS initialization failed')),
                    exists: () => Promise.resolve([false]),
                    delete: () => Promise.reject(new Error('GCS initialization failed'))
                }),
                exists: () => Promise.resolve([false]),
                create: () => Promise.reject(new Error('GCS initialization failed'))
            }),
            isConfigured: false
        },
        verifyConnection: async () => {
            console.error('GCS initialization failed - connection verification skipped');
            return false;
        }
    };
}

// Helper function to generate signed URLs (similar to S3 getSignedUrl)
const getSignedUrl = async (filename, expiresInSeconds = 60 * 60 * 24) => {
    if (!filename) return null;

    const options = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresInSeconds * 1000,
    };

    try {
        const [url] = await storage.bucket(process.env.GCS_BUCKET_NAME || 'focus-ritual-files').file(filename).getSignedUrl(options);
        return url;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return null;
    }
};