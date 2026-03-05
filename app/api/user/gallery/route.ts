import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const take = parseInt(searchParams.get('take') || '100', 10);
    const cursor = searchParams.get('cursor');

    // Fetch the user's media ordered tightly by creation date across all their trips
    const galleryItems = await prisma.tripMedia.findMany({
      where: {
        trip: {
          userId: session.user.id,
          deletedAt: null // Explicitly ignore media from soft-deleted trips
        }
      },
      take: Math.min(take, 100), // Cap payload hard
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        trip: {
          select: {
            title: true,
            slug: true,
          }
        }
      }
    });

    const nextCursor = galleryItems.length === take ? galleryItems[galleryItems.length - 1].id : null;

    return NextResponse.json({
      items: galleryItems,
      nextCursor
    });

  } catch (error) {
    console.error('Fetch gallery error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
