import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const B2_APP_KEY_ID = process.env.B2_APP_KEY_ID!;
const B2_APP_KEY = process.env.B2_APP_KEY!;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID!;

// Helper to authenticate with B2 to get the API URL and authorization token
async function getB2AuthTokens() {
  const authString = Buffer.from(`${B2_APP_KEY_ID}:${B2_APP_KEY}`).toString('base64');
  const res = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: `Basic ${authString}` },
  });

  if (!res.ok) {
    throw new Error('Failed to authorize with Backblaze B2');
  }

  return res.json();
}

/**
 * Ensures we don't leave orphaned photos floating in cloud storage.
 * Extracts the file name from the B2 URL and explicitly asks B2 to delete it.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; mediaId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug, mediaId } = await params;

    // Verify trip exists and user owns it, AND fetch the media at the same time
    const trip = await prisma.trip.findFirst({
      where: { slug: slug, userId: session.user.id, deletedAt: null },
      select: { 
        id: true,
        media: {
          where: { id: mediaId },
          take: 1
        }
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found or unauthorized' }, { status: 404 });
    }

    const mediaTarget = trip.media[0];
    if (!mediaTarget) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // 1. Delete object from B2 to prevent orphaned files (Cost saving & Architectural Safeguard)
    try {
      // The mediaTarget.url looks like: https://f005.backblazeb2.com/file/travel-blueprint/123456789-photo.jpg
      const parsedUrl = new URL(mediaTarget.url);
      const pathnameParts = parsedUrl.pathname.split('/'); 
      // ['', 'file', 'bucket-name', 'filename.jpg']
      
      const fileName = pathnameParts.slice(3).join('/'); // Rejoin in case of nested folders
      
      if (fileName) {
        const b2Auth = await getB2AuthTokens();
        
        // B2 requires both fileName and bucketId to hide/delete an object via the API without knowing the explicit fileId.
        // The safest way is to utilize b2_hide_file which cleanly removes it from public viewing and flags it for lifecycle deletion,
        // or actually query for the fileId depending on B2 setup. The easiest clean standard is fetching file info.
        
        // Fast path: find specific fileId for strict deletion
        const listRes = await fetch(`${b2Auth.apiInfo.storageApi.apiUrl}/b2api/v3/b2_list_file_names`, {
          method: 'POST',
          headers: {
            'Authorization': b2Auth.authorizationToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bucketId: B2_BUCKET_ID,
            startFileName: fileName,
            maxFileCount: 1,
            prefix: fileName
          })
        });

        if (listRes.ok) {
          const listData = await listRes.json();
          const targetFileId = listData.files?.[0]?.fileId;
          
          if (targetFileId) {
            // Delete it definitively
            await fetch(`${b2Auth.apiInfo.storageApi.apiUrl}/b2api/v3/b2_delete_file_version`, {
              method: 'POST',
              headers: {
                'Authorization': b2Auth.authorizationToken,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fileName: fileName,
                fileId: targetFileId
              })
            });
          }
        }
      }
    } catch (b2Error) {
      console.error('Non-blocking B2 cleanup error:', b2Error);
    }

    // 2. Delete the record from our primary database
    await prisma.tripMedia.delete({
      where: { id: mediaTarget.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete media error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
