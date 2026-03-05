import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        country: true,
        slug: true,
        coverImageUrl: true,
        createdAt: true,
        _count: { select: { trips: { where: { isPublic: true, deletedAt: null } } } },
      },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('[GET /api/locations]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
