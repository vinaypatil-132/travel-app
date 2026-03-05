import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
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
      where: { slug, isPublic: true, deletedAt: null },
      select: { id: true, userId: true },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    // Users cannot save their own trips
    if (trip.userId === session.user.id) {
      return NextResponse.json({ error: 'You cannot save your own trip.' }, { status: 400 });
    }

    // Check for existing save BEFORE insert — explicit 409 before DB constraint fires
    const existing = await prisma.savedTrip.findUnique({
      where: { userId_tripId: { userId: session.user.id, tripId: trip.id } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already saved.', saved: true }, { status: 409 });
    }

    await prisma.savedTrip.create({
      data: { userId: session.user.id, tripId: trip.id },
    });

    return NextResponse.json({ saved: true }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/trips/[slug]/save]', error);
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
      select: { id: true },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    const saved = await prisma.savedTrip.findUnique({
      where: { userId_tripId: { userId: session.user.id, tripId: trip.id } },
    });

    if (!saved) {
      return NextResponse.json({ error: 'Not saved.', saved: false }, { status: 404 });
    }

    await prisma.savedTrip.delete({
      where: { userId_tripId: { userId: session.user.id, tripId: trip.id } },
    });

    return NextResponse.json({ saved: false });
  } catch (error) {
    console.error('[DELETE /api/trips/[slug]/save]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
