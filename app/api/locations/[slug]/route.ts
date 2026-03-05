import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const location = await prisma.location.findUnique({
      where: { slug },
      include: {
        trips: {
          where: { isPublic: true, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            coverImageUrl: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
            _count: { select: { days: true } },
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found.' }, { status: 404 });
    }

    return NextResponse.json({ location });
  } catch (error) {
    console.error('[GET /api/locations/[slug]]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
