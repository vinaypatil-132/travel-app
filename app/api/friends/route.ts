import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get accepted friends and pending requests
    const [friends, pendingReceived, pendingSent] = await Promise.all([
      prisma.userFriend.findMany({
        where: { userId, status: 'ACCEPTED' },
        include: {
          friend: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Requests received from others (friendId = me, status = PENDING)
      prisma.userFriend.findMany({
        where: { friendId: userId, status: 'PENDING' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Requests sent by me (userId = me, status = PENDING)
      prisma.userFriend.findMany({
        where: { userId, status: 'PENDING' },
        include: {
          friend: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      friends: friends.map((f) => ({ id: f.id, createdAt: f.createdAt, user: f.friend })),
      pendingReceived: pendingReceived.map((f) => ({ id: f.id, createdAt: f.createdAt, user: f.user })),
      pendingSent: pendingSent.map((f) => ({ id: f.id, createdAt: f.createdAt, user: f.friend })),
    });
  } catch (error: unknown) {
    console.error('GET /api/friends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
