import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { friendId } = await params;

    // Delete BOTH bidirectional rows atomically
    await prisma.$transaction([
      prisma.userFriend.deleteMany({
        where: { userId, friendId },
      }),
      prisma.userFriend.deleteMany({
        where: { userId: friendId, friendId: userId },
      }),
    ]);

    return NextResponse.json({ message: 'Friend removed' });
  } catch (error: unknown) {
    console.error('DELETE /api/friends/[friendId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
