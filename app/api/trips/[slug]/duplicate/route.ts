import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tripCreateLimiter } from '@/lib/rate-limit';
import slugify from 'slugify';

// Derive transaction client type from the Prisma singleton (Prisma v7 compatible)
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function generateUniqueSlug(tx: TxClient, sourceSlug: string): Promise<string> {
  const base = slugify(sourceSlug, { lower: true, strict: true });
  let slug = `${base}-copy`;
  let counter = 1;
  while (counter <= 10) {
    const exists = await tx.trip.findFirst({ where: { slug } });
    if (!exists) return slug;
    slug = `${base}-copy-${counter++}`;
  }
  return `${base}-copy-${Date.now()}`;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { success } = tripCreateLimiter.check(session.user.id);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const { slug } = await params;

    const source = await prisma.trip.findFirst({
      where: { slug, deletedAt: null },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: { activities: { orderBy: { orderIndex: 'asc' } } },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    const isOwner = source.userId === session.user.id;
    if (!source.isPublic && !isOwner) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    let newTrip;
    try {
      newTrip = await prisma.$transaction(async (tx) => {
        const newSlug = await generateUniqueSlug(tx, source.slug);

        const trip = await tx.trip.create({
          data: {
            title: source.title,
            slug: newSlug,
            description: source.description,
            locationId: source.locationId,
            isPublic: false,
            coverImageUrl: source.coverImageUrl,
            userId: session.user.id,
          },
        });

        for (const day of source.days) {
          const newDay = await tx.tripDay.create({
            data: {
              tripId: trip.id,
              dayNumber: day.dayNumber,
              title: day.title,
              description: day.description,
            },
          });

          if (day.activities.length > 0) {
            await tx.tripActivity.createMany({
              data: day.activities.map((a) => ({
                tripDayId: newDay.id,
                title: a.title,
                description: a.description,
                orderIndex: a.orderIndex,
              })),
            });
          }
        }

        return trip;
      });
    } catch (txError) {
      const err = txError as { code?: string };
      if (err?.code === 'P2002') {
        return NextResponse.json(
          { error: 'Could not generate a unique slug. Please try again.' },
          { status: 409 }
        );
      }
      throw txError;
    }

    return NextResponse.json(
      { trip: { id: newTrip.id, slug: newTrip.slug, title: newTrip.title } },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/trips/[slug]/duplicate]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
