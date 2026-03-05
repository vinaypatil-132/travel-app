import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// This file is server-only. Never import from client components.
// The B2 secrets never leave the server.

const b2Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT!,
  region: process.env.B2_REGION ?? 'us-east-005',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME!;

/**
 * Generate a pre-signed PUT URL for direct browser → B2 uploads.
 * The signed URL is valid for 15 minutes.
 *
 * @param key      - S3 object key (e.g. "trips/cover-xyz.jpg")
 * @param contentType - MIME type of the file being uploaded
 * @returns        Pre-signed PUT URL and the object key
 */
export async function generateUploadSignedUrl(
  key: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(b2Client, command, { expiresIn: 900 }); // 15 min

  return { url, key };
}

/**
 * Build the public CDN URL for an already-uploaded object.
 */
export function getPublicUrl(key: string): string {
  return `${process.env.B2_ENDPOINT}/${BUCKET_NAME}/${key}`;
}
