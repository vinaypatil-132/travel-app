import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({ targetUserId: z.string().min(1) });

export async function POST(req: NextRequest) {
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

    const { targetUserId } = result.data;

    if (userId === targetUserId) {
      return NextResponse.json({ error: 'Cannot send request to yourself' }, { status: 400 });
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check for existing relationship
    const existing = await prisma.userFriend.findFirst({
      where: {
        OR: [
          { userId, friendId: targetUserId },
          { userId: targetUserId, friendId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return NextResponse.json({ error: 'Already friends' }, { status: 409 });
      }
      if (existing.status === 'PENDING') {
        return NextResponse.json({ error: 'Friend request already sent or pending' }, { status: 409 });
      }
      if (existing.status === 'BLOCKED') {
        return NextResponse.json({ error: 'Cannot send request to this user' }, { status: 403 });
      }
    }

    // Create the pending request (A → B)
    const request = await prisma.userFriend.create({
      data: {
        userId,
        friendId: targetUserId,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ request, message: `Friend request sent to ${targetUser.name}` }, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/friends/request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
