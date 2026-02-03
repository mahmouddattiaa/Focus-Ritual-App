const AWS = require('aws-sdk');

const wasabiConfig = {
  endpoint: 'https://s3.eu-central-1.wasabisys.com', 
  accessKeyId: process.env.WASABI_ACCESS_KEY, 
  secretAccessKey: process.env.WASABI_SECRET_KEY 
};

const s3 = new AWS.S3(wasabiConfig);

module.exports = { s3, bucket: 'focus-ritual-files' }; 