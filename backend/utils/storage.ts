import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if Railway bucket is configured
const isRailwayBucketConfigured = () => {
  return !!(
    process.env.RAILWAY_BUCKET_ENDPOINT &&
    process.env.RAILWAY_BUCKET_NAME &&
    process.env.RAILWAY_BUCKET_ACCESS_KEY &&
    process.env.RAILWAY_BUCKET_SECRET_KEY
  );
};

// Initialize S3 client if Railway bucket is configured
let s3Client: S3Client | null = null;
if (isRailwayBucketConfigured()) {
  try {
    s3Client = new S3Client({
      endpoint: process.env.RAILWAY_BUCKET_ENDPOINT,
      region: process.env.RAILWAY_BUCKET_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.RAILWAY_BUCKET_ACCESS_KEY!,
        secretAccessKey: process.env.RAILWAY_BUCKET_SECRET_KEY!,
      },
      forcePathStyle: true, // Required for S3-compatible services
    });
    console.log(`✅ Railway bucket client initialized`);
    console.log(`   Endpoint: ${process.env.RAILWAY_BUCKET_ENDPOINT}`);
    console.log(`   Bucket: ${process.env.RAILWAY_BUCKET_NAME}`);
    console.log(`   Region: ${process.env.RAILWAY_BUCKET_REGION || 'auto'}`);
  } catch (error: any) {
    console.error('❌ Failed to initialize Railway bucket client:', error.message);
    s3Client = null;
  }
}

/**
 * Upload a file to storage (Railway bucket or local filesystem)
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  if (s3Client && isRailwayBucketConfigured()) {
    // Upload to Railway bucket
    const bucketName = process.env.RAILWAY_BUCKET_NAME!;
    const key = `uploads/${fileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'private', // Make files private by default
      });

      await s3Client.send(command);
      
      // Return the file URL path (will be served through /uploads route)
      return `/uploads/${fileName}`;
    } catch (error: any) {
      console.error('❌ Error uploading to Railway bucket:', {
        bucket: bucketName,
        key: key,
        errorCode: error.Code || error.name,
        errorMessage: error.message,
        httpStatusCode: error.$metadata?.httpStatusCode,
      });
      
      // Provide more helpful error message
      if (error.Code === 'AccessDenied' || error.name === 'AccessDenied') {
        throw new Error(`Access denied to Railway bucket. Please verify:
1. RAILWAY_BUCKET_NAME is correct (current: ${bucketName})
2. RAILWAY_BUCKET_ACCESS_KEY and RAILWAY_BUCKET_SECRET_KEY are correct
3. The bucket exists and has proper permissions
4. RAILWAY_BUCKET_ENDPOINT is correct`);
      }
      
      throw new Error(`Failed to upload file to bucket: ${error.message}`);
    }
  } else {
    // Fallback to local filesystem
    const uploadsDir = db.getUploadsDir();
    const filePath = join(uploadsDir, fileName);

    // Ensure directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write file to local filesystem
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, fileBuffer);

    return `/uploads/${fileName}`;
  }
}

/**
 * Delete a file from storage (Railway bucket or local filesystem)
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
    return; // Invalid file URL
  }

  const fileName = fileUrl.replace('/uploads/', '');

  if (s3Client && isRailwayBucketConfigured()) {
    // Delete from Railway bucket
    const bucketName = process.env.RAILWAY_BUCKET_NAME!;
    const key = `uploads/${fileName}`;

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await s3Client.send(command);
    } catch (error: any) {
      console.error('Error deleting from Railway bucket:', error);
      // Don't throw - file might not exist
    }
  } else {
    // Delete from local filesystem
    const uploadsDir = db.getUploadsDir();
    const filePath = join(uploadsDir, fileName);

    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch (error: any) {
      console.error('Error deleting local file:', error);
      // Don't throw - file might not exist
    }
  }
}

/**
 * Get a signed URL for a file in Railway bucket (for direct access)
 * Returns null if using local storage or if file doesn't exist
 */
export async function getFileUrl(fileUrl: string, expiresIn: number = 3600): Promise<string | null> {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
    return null;
  }

  if (!s3Client || !isRailwayBucketConfigured()) {
    // For local storage, return the relative URL (served by express.static)
    return fileUrl;
  }

  const fileName = fileUrl.replace('/uploads/', '');
  const bucketName = process.env.RAILWAY_BUCKET_NAME!;
  const key = `uploads/${fileName}`;

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error: any) {
    console.error('Error generating signed URL:', error);
    return null;
  }
}

/**
 * Check if Railway bucket storage is being used
 */
export function isUsingBucketStorage(): boolean {
  return isRailwayBucketConfigured() && s3Client !== null;
}

