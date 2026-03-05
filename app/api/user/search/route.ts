import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const q = req.nextUrl.searchParams.get('q');
    if (!q || q.trim().length < 3) {
      return NextResponse.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: session.user.id } }, // Exclude self
          {
            OR: [
              { email: { contains: q.trim(), mode: 'insensitive' } },
              { name: { contains: q.trim(), mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 10,
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error('User search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
