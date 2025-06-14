const { Storage } = require('@google-cloud/storage');

// Initialize Google Cloud Storage
const storage = new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    keyFilename: process.env.GCS_KEY_FILE, // Path to service account key JSON file
});

const bucket = process.env.GCS_BUCKET_NAME || 'focus-ritual-files';
const gcs = storage.bucket(bucket);

// Helper function to generate signed URLs (similar to S3 getSignedUrl)
const getSignedUrl = async(filename, expiresInSeconds = 60 * 60 * 24) => {
    if (!filename) return null;

    const options = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresInSeconds * 1000,
    };

    try {
        const [url] = await gcs.file(filename).getSignedUrl(options);
        return url;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return null;
    }
};

module.exports = { storage, gcs, bucket, getSignedUrl };