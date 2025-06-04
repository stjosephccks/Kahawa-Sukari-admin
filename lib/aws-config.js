import AWS from 'aws-sdk';

const bucketName= 'kahawa-sukari'


const s3 = new AWS.S3({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: 'us-east-1'
});

export async function uploadToS3(file, fileName) {
    const fileStream = require('fs').createReadStream(file.filepath);
    
    const uploadParams = {
        Bucket: bucketName,
        Key: `documents/${Date.now()}-${fileName}`,
        Body: fileStream,
        ContentType: file.mimetype,
    };

    try {
        const result = await s3.upload(uploadParams).promise();
        return {
            key: result.Key,
            url: result.Location
        };
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error('Failed to upload file to S3');
    }
}

export async function getFileFromS3(key) {
    const downloadParams = {
        Bucket: bucketName,
        Key: key
    };

    try {
        const result = await s3.getObject(downloadParams).promise();
        return result.Body;
    } catch (error) {
        console.error('Error downloading from S3:', error);
        throw new Error('Failed to download file from S3');
    }
}
