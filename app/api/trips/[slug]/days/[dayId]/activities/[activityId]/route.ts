import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const updateActivitySchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).optional(),
  orderIndex: z.number().int().min(0).optional(),
});

async function resolveActivity(
  slug: string,
  dayId: string,
  activityId: string,
  userId: string
) {
  const trip = await prisma.trip.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!trip) return { activity: null, error: 'Trip not found.', status: 404 };
  if (trip.userId !== userId) return { activity: null, error: 'Forbidden.', status: 403 };

  const day = await prisma.tripDay.findFirst({
    where: { id: dayId, tripId: trip.id },
  });
  if (!day) return { activity: null, error: 'Day not found.', status: 404 };

  const activity = await prisma.tripActivity.findFirst({
    where: { id: activityId, tripDayId: day.id },
  });
  if (!activity) return { activity: null, error: 'Activity not found.', status: 404 };

  return { activity, error: null, status: 200 };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; dayId: string; activityId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { slug, dayId, activityId } = await params;
    const { activity, error, status } = await resolveActivity(
      slug,
      dayId,
      activityId,
      session.user.id
    );
    if (!activity) return NextResponse.json({ error }, { status });

    const body = await req.json();
    const parsed = updateActivitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await prisma.tripActivity.update({
      where: { id: activity.id },
      data: parsed.data,
    });

    return NextResponse.json({ activity: updated });
  } catch (error) {
    console.error('[PUT /api/trips/[slug]/days/[dayId]/activities/[activityId]]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; dayId: string; activityId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { slug, dayId, activityId } = await params;
    const { activity, error, status } = await resolveActivity(
      slug,
      dayId,
      activityId,
      session.user.id
    );
    if (!activity) return NextResponse.json({ error }, { status });

    await prisma.tripActivity.delete({ where: { id: activity.id } });

    return NextResponse.json({ message: 'Activity deleted.' });
  } catch (error) {
    console.error('[DELETE /api/trips/[slug]/days/[dayId]/activities/[activityId]]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
