import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const createDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

async function getTripAndVerifyOwner(slug: string, userId: string) {
  const trip = await prisma.trip.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!trip) return { trip: null, error: 'Trip not found.', status: 404 };
  if (trip.userId !== userId) return { trip: null, error: 'Forbidden.', status: 403 };
  return { trip, error: null, status: 200 };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    const trip = await prisma.trip.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, userId: true, isPublic: true },
    });

    if (!trip) return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });

    const isOwner = session?.user?.id === trip.userId;
    if (!trip.isPublic && !isOwner) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    const days = await prisma.tripDay.findMany({
      where: { tripId: trip.id },
      orderBy: { dayNumber: 'asc' },
      include: {
        activities: { orderBy: { orderIndex: 'asc' } },
      },
    });

    return NextResponse.json({ days });
  } catch (error) {
    console.error('[GET /api/trips/[slug]/days]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { slug } = await params;
    const { trip, error, status } = await getTripAndVerifyOwner(slug, session.user.id);
    if (!trip) return NextResponse.json({ error }, { status });

    const body = await req.json();
    const parsed = createDaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const day = await prisma.tripDay.create({
      data: { ...parsed.data, tripId: trip.id },
      include: { activities: { orderBy: { orderIndex: 'asc' } } },
    });

    return NextResponse.json({ day }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/trips/[slug]/days]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
