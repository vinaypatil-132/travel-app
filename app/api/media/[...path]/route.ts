import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT!,
  region: process.env.B2_REGION ?? "us-east-005",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
  forcePathStyle: true,
});

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    
    // Convert the URL array back into the B2 Storage Key
    const key = path.join("/");
    
    const command = new GetObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME!,
      Key: key,
    });
    
    // Generate an AWS SDK signed url valid for 1 hour
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Fetch the binary object securely server-side
    const b2Res = await fetch(signedUrl);
    
    if (!b2Res.ok) {
      console.error("B2 Fetch Failed:", b2Res.status, b2Res.statusText);
      return new NextResponse("Image not found on S3", { status: 404 });
    }

    // Next/Image rigidly requires valid Image MIME types.
    // Since we omit explicit types on the client to fix CORS, B2 may return application/octet-stream.
    let contentType = b2Res.headers.get("content-type") || "application/octet-stream";
    const ext = key.split('.').pop()?.toLowerCase();
    
    if (contentType === "application/octet-stream" || contentType === "binary/octet-stream" || !contentType) {
      if (ext === 'png') contentType = 'image/png';
      else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
      else if (ext === 'webp') contentType = 'image/webp';
      else if (ext === 'gif') contentType = 'image/gif';
      else if (ext === 'mp4') contentType = 'video/mp4';
      else if (ext === 'webm') contentType = 'video/webm';
    }

    // Stream the B2 output directly to the client under the internal namespace with immutable caching
    return new NextResponse(b2Res.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

  } catch (error) {
    console.error("[GET /api/media]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
