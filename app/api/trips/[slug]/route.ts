import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const updateTripSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  isPublic: z.boolean().optional(),
  coverImageUrl: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  locationId: z.string().min(1).optional(), // Prisma v7 uses cuid2 — not compatible with z.string().cuid()
});

const TRIP_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  isPublic: true,
  coverImageUrl: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true } },
  location: { select: { id: true, name: true, country: true, slug: true } },
  media: { orderBy: { orderIndex: 'asc' as const }, select: { id: true, url: true, mediaType: true, visibility: true } },
  days: {
    orderBy: { dayNumber: 'asc' as const },
    select: {
      id: true,
      dayNumber: true,
      title: true,
      description: true,
      activities: {
        orderBy: { orderIndex: 'asc' as const },
        select: { id: true, title: true, description: true, orderIndex: true },
      },
    },
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    const trip = await prisma.trip.findFirst({
      where: { slug, deletedAt: null },
      select: TRIP_SELECT,
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    // Private trips are only visible to their owner
    const isOwner = session?.user?.id === trip.user.id;
    if (!(trip.isPublic || isOwner)) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    // ── Media Visibility Filtering ──────────────────────────────────────────
    // Owners always see everything.
    // Everyone else must have their access evaluated per media item.
    let filteredMedia = trip.media;

    if (!isOwner) {
      const viewerId = session?.user?.id ?? null;

      // Check friendship once for the whole trip (if viewer is logged in)
      let isFriend = false;
      if (viewerId) {
        const friendship = await prisma.userFriend.findFirst({
          where: {
            userId: trip.user.id,  // media owner
            friendId: viewerId,
            status: 'ACCEPTED',
          },
          select: { id: true },
        });
        isFriend = !!friendship;
      }

      // For SELECTED items, fetch which mediaIds the viewer can access
      const selectedMediaIds = viewerId
        ? await prisma.mediaAccess
            .findMany({
              where: { userId: viewerId },
              select: { mediaId: true },
            })
            .then((rows) => new Set(rows.map((r) => r.mediaId)))
        : new Set<string>();

      filteredMedia = trip.media.filter((m) => {
        if (m.visibility === 'PUBLIC') return true;
        if (m.visibility === 'FRIENDS' && isFriend) return true;
        if (m.visibility === 'SELECTED' && selectedMediaIds.has(m.id)) return true;
        // PRIVATE — owner only (already handled above)
        return false;
      });
    }

    return NextResponse.json({ trip: { ...trip, media: filteredMedia } });
  } catch (error) {
    console.error('[GET /api/trips/[slug]]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { slug } = await params;

    const trip = await prisma.trip.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, userId: true },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }
    if (trip.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateTripSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await prisma.trip.update({
      where: { id: trip.id },
      data: parsed.data,
      select: TRIP_SELECT,
    });

    return NextResponse.json({ trip: updated });
  } catch (error) {
    console.error('[PUT /api/trips/[slug]]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { slug } = await params;

    const trip = await prisma.trip.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, userId: true },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }
    if (trip.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // Soft delete
    await prisma.trip.update({
      where: { id: trip.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: 'Trip deleted.' });
  } catch (error) {
    console.error('[DELETE /api/trips/[slug]]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
