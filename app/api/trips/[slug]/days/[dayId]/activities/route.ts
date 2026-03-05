import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const createActivitySchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  orderIndex: z.number().int().min(0),
});

async function resolveDay(slug: string, dayId: string, userId: string) {
  const trip = await prisma.trip.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!trip) return { day: null, error: 'Trip not found.', status: 404 };
  if (trip.userId !== userId) return { day: null, error: 'Forbidden.', status: 403 };

  const day = await prisma.tripDay.findFirst({
    where: { id: dayId, tripId: trip.id },
  });
  if (!day) return { day: null, error: 'Day not found.', status: 404 };

  return { day, error: null, status: 200 };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; dayId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { slug, dayId } = await params;
    const { day, error, status } = await resolveDay(slug, dayId, session.user.id);
    if (!day) return NextResponse.json({ error }, { status });

    const body = await req.json();
    const parsed = createActivitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const activity = await prisma.tripActivity.create({
      data: { ...parsed.data, tripDayId: day.id },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/trips/[slug]/days/[dayId]/activities]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
