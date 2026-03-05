import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'SELECTED', 'PRIVATE']),
  selectedUserIds: z.array(z.string()).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { mediaId } = await params;

    // Verify ownership – check against media.userId directly
    const media = await prisma.tripMedia.findUnique({
      where: { id: mediaId },
      select: { id: true, userId: true },
    });

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    if (media.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { visibility, selectedUserIds } = result.data;

    await prisma.$transaction(async (tx) => {
      // Update visibility
      await tx.tripMedia.update({
        where: { id: mediaId },
        data: { visibility },
      });

      // Clear existing access grants
      await tx.mediaAccess.deleteMany({ where: { mediaId } });

      // Re-create if SELECTED
      if (visibility === 'SELECTED' && selectedUserIds && selectedUserIds.length > 0) {
        await tx.mediaAccess.createMany({
          data: selectedUserIds.map((uid) => ({ mediaId, userId: uid })),
          skipDuplicates: true,
        });
      }
    });

    return NextResponse.json({ message: 'Visibility updated' });
  } catch (error: unknown) {
    console.error('PUT /api/trips/media/[mediaId]/visibility error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
