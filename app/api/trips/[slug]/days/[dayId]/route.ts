import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const updateDaySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
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

export async function PUT(
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
    const parsed = updateDaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await prisma.tripDay.update({
      where: { id: day.id },
      data: parsed.data,
      include: { activities: { orderBy: { orderIndex: 'asc' } } },
    });

    return NextResponse.json({ day: updated });
  } catch (error) {
    console.error('[PUT /api/trips/[slug]/days/[dayId]]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; dayId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { slug, dayId } = await params;
    const { day, error, status } = await resolveDay(slug, dayId, session.user.id);
    if (!day) return NextResponse.json({ error }, { status });

    await prisma.tripDay.delete({ where: { id: day.id } });

    return NextResponse.json({ message: 'Day deleted.' });
  } catch (error) {
    console.error('[DELETE /api/trips/[slug]/days/[dayId]]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
