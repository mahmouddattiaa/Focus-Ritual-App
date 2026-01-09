# Google Cloud Storage Setup

This document outlines how to set up Google Cloud Storage for the Focus Ritual application.

## 1. Create a Google Cloud Platform (GCP) Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown and select "New Project"
3. Name your project (e.g., "focus-ritual") and click "Create"
4. Make note of your Project ID

## 2. Enable the Google Cloud Storage API

1. In your project, navigate to "APIs & Services" > "Library"
2. Search for "Cloud Storage API" and select it
3. Click "Enable"

## 3. Create a Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Name your service account (e.g., "focus-ritual-storage")
4. For the role, select "Storage" > "Storage Admin" (or "Storage Object Admin" for more restricted access)
5. Click "Continue" and then "Done"

## 4. Create and Download a Service Account Key

1. From the Service Accounts list, click on your newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" as the key type
5. Click "Create" to download the key file
6. Store this file securely in your project (e.g., in a `keys` directory)

## 5. Create a Storage Bucket

1. Go to "Cloud Storage" > "Buckets"
2. Click "Create Bucket"
3. Name your bucket (e.g., "focus-ritual-files")
4. Choose your preferred location, storage class, and access control
5. Click "Create"

## 6. Configure Environment Variables

Add the following environment variables to your `.env` file:

```
GCS_PROJECT_ID=your-project-id
GCS_KEY_FILE=path/to/your-service-account-key.json
GCS_BUCKET_NAME=your-bucket-name
```

Example:
```
GCS_PROJECT_ID=focus-ritual-12345
GCS_KEY_FILE=./keys/focus-ritual-storage-key.json
GCS_BUCKET_NAME=focus-ritual-files
```

## 7. Configure Public Access (Optional)

If you need certain files (like profile pictures) to be publicly accessible:

1. Go to your bucket's permissions tab
2. Add a new member with the role "Storage Object Viewer"
3. Set the member to "allUsers" to make objects public

Alternatively, you can make specific folders public using the Google Cloud Console or by setting up a bucket policy.

## 8. CORS Configuration

To allow browser requests to your bucket, you'll need to set up CORS:

1. Go to your bucket details
2. Click on the "CORS" tab
3. Add a configuration like:

```json
[
  {
    "origin": ["https://yourdomain.com"],
    "method": ["GET", "HEAD", "PUT", "POST"],
    "responseHeader": ["Content-Type", "Content-MD5", "Content-Disposition"],
    "maxAgeSeconds": 3600
  }
]
```

Replace `https://yourdomain.com` with your application's domain, or use `*` for development.

## Troubleshooting

- **403 Forbidden errors**: Check your service account permissions and bucket access settings
- **CORS errors**: Ensure your CORS configuration is correct for your domain
- **Authentication errors**: Verify your service account key file path is correct and the key is valid 