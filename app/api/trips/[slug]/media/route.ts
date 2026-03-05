import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const payloadSchema = z.object({
  url: z.string().min(1),
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  caption: z.string().max(300).optional(),
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'SELECTED', 'PRIVATE']).default('PUBLIC'),
  selectedUserIds: z.array(z.string()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const userId = session.user.id;

    const trip = await prisma.trip.findFirst({
      where: { slug, userId, deletedAt: null },
      select: { id: true },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found or unauthorized' }, { status: 404 });
    }

    const body = await req.json();
    const result = payloadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid media payload' }, { status: 400 });
    }

    const { url, mediaType, caption, visibility, selectedUserIds } = result.data;

    const lastMedia = await prisma.tripMedia.findFirst({
      where: { tripId: trip.id },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const nextOrderIndex = lastMedia ? lastMedia.orderIndex + 1 : 0;

    const media = await prisma.$transaction(async (tx) => {
      const created = await tx.tripMedia.create({
        data: {
          tripId: trip.id,
          userId,
          url,
          mediaType,
          caption,
          visibility,
          orderIndex: nextOrderIndex,
        },
      });

      if (visibility === 'SELECTED' && selectedUserIds && selectedUserIds.length > 0) {
        await tx.mediaAccess.createMany({
          data: selectedUserIds.map((uid) => ({ mediaId: created.id, userId: uid })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    return NextResponse.json({ media }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create media error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
