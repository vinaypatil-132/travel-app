import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const client = new S3Client({
  endpoint: process.env.B2_ENDPOINT!,
  region: process.env.B2_REGION ?? 'us-east-005',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
  forcePathStyle: true,
});

async function main() {
  try {
    const command = new PutBucketCorsCommand({
      Bucket: process.env.B2_BUCKET_NAME!,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["PUT", "POST", "GET", "HEAD"],
            AllowedOrigins: ["*"], // For development, allow all. In prod, restrict to domain.
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    });
    
    await client.send(command);
    console.log("✅ B2 Bucket CORS configured successfully. Browser uploads will now work.");
  } catch (error) {
    console.error("❌ Failed to configure CORS:", error);
  }
}

main();
