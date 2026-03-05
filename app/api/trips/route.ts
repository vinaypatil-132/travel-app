import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { tripCreateLimiter } from '@/lib/rate-limit';
import { z } from 'zod';
import slugify from 'slugify';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;

const createTripSchema = z.object({
  title: z.string().min(3).max(200),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  locationId: z.string().min(1), // Prisma v7 uses cuid2 — not compatible with z.string().cuid()
  isPublic: z.boolean().default(false),
  coverImageUrl: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().url().optional()),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
    const limit = Math.min(Math.max(1, rawLimit || DEFAULT_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const search = searchParams.get('search') ?? '';

    const where = {
      isPublic: true,
      deletedAt: null,
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [trips, total] = await prisma.$transaction([
      prisma.trip.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          coverImageUrl: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
          location: { select: { id: true, name: true, country: true, slug: true } },
          _count: { select: { days: true } },
        },
      }),
      prisma.trip.count({ where }),
    ]);

    return NextResponse.json({
      trips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/trips]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Rate limiting by userId
    const { success } = tripCreateLimiter.check(session.user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = createTripSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, description, locationId, isPublic, coverImageUrl } = parsed.data;

    // Verify location exists
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      return NextResponse.json({ error: 'Location not found.' }, { status: 404 });
    }

    // Generate unique slug
    const baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.trip.findFirst({ where: { slug, deletedAt: null } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const trip = await prisma.trip.create({
      data: {
        title,
        slug,
        description,
        locationId,
        isPublic,
        coverImageUrl,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        isPublic: true,
        coverImageUrl: true,
        createdAt: true,
        location: { select: { id: true, name: true, country: true, slug: true } },
      },
    });

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/trips]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
