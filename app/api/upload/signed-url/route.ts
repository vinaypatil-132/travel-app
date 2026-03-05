import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateUploadSignedUrl } from '@/lib/b2';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const querySchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'video/mp4',
    'video/webm',
  ]),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const parsed = querySchema.safeParse({
      fileName: searchParams.get('fileName'),
      contentType: searchParams.get('contentType'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid params', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fileName, contentType } = parsed.data;
    const ext = fileName.split('.').pop() ?? 'jpg';
    const key = `uploads/${session.user.id}/${uuidv4()}.${ext}`;

    const { url } = await generateUploadSignedUrl(key, contentType);

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error('[GET /api/upload/signed-url]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
