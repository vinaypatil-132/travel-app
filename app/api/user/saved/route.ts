import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
    const limit = Math.min(Math.max(1, rawLimit || DEFAULT_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where = {
      userId: session.user.id,
      trip: { isPublic: true, deletedAt: null },
    };

    const [savedTrips, total] = await prisma.$transaction([
      prisma.savedTrip.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          createdAt: true,
          trip: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              coverImageUrl: true,
              createdAt: true,
              user: { select: { id: true, name: true } },
              location: { select: { id: true, name: true, country: true, slug: true } },
              _count: { select: { days: true } },
            },
          },
        },
      }),
      prisma.savedTrip.count({ where }),
    ]);

    return NextResponse.json({
      trips: savedTrips.map((s) => s.trip),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/user/saved]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
