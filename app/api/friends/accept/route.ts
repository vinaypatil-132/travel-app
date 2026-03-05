import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  requestId: z.string().min(1),
  action: z.enum(['ACCEPT', 'DECLINE']),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { requestId, action } = result.data;

    // Find the PENDING request directed at ME (friendId = me)
    const request = await prisma.userFriend.findFirst({
      where: { id: requestId, friendId: userId, status: 'PENDING' },
    });

    if (!request) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    if (action === 'DECLINE') {
      await prisma.userFriend.update({
        where: { id: requestId },
        data: { status: 'DECLINED' },
      });
      return NextResponse.json({ message: 'Friend request declined' });
    }

    // ACCEPT: Update the original row AND create the reciprocal row
    // This gives us bidirectional ACCEPTED rows (A→B and B→A) for simple queries
    await prisma.$transaction([
      prisma.userFriend.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      }),
      prisma.userFriend.upsert({
        where: {
          userId_friendId: {
            userId: userId,          // B
            friendId: request.userId, // A
          },
        },
        create: {
          userId: userId,
          friendId: request.userId,
          status: 'ACCEPTED',
        },
        update: {
          status: 'ACCEPTED',
        },
      }),
    ]);

    return NextResponse.json({ message: 'Friend request accepted' });
  } catch (error: unknown) {
    console.error('PUT /api/friends/accept error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
