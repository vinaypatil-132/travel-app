import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tripCreateLimiter } from '@/lib/rate-limit';
import slugify from 'slugify';

// Derive transaction client type from the Prisma singleton (Prisma v7 compatible)
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalUrl = z
  .string()
  .optional()
  .transform((v) => (v === '' ? undefined : v))
  .pipe(z.string().url().optional());

// ─── Validation Schema ────────────────────────────────────────────────────────

const daySchema = z.object({
  dayNumber: z.number().int().min(1),
  title: z.string().min(1).max(200),
  description: optionalString,
});

const wizardSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: optionalString,
    // .cuid() NOT used — Prisma v7 generates cuid2 which has a different format
    locationId: z.string().min(1),
    isPublic: z.boolean().default(false),
    coverImageUrl: optionalUrl,
    days: z.array(daySchema).min(1, 'At least one day is required.'),
  })
  .superRefine((data, ctx) => {
    const numbers = data.days.map((d) => d.dayNumber);
    const sorted = [...numbers].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['days'],
          message: `Day numbers must start at 1 and be sequential. Found: [${numbers.join(', ')}]`,
        });
        return;
      }
    }
  });

// ─── Slug Generation (DB-constraint-safe) ────────────────────────────────────

async function generateUniqueSlug(tx: TxClient, title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true }) || 'trip';
  let slug = base;
  let counter = 1;
  while (counter <= 10) {
    const exists = await tx.trip.findFirst({ where: { slug } });
    if (!exists) return slug;
    slug = `${base}-${counter++}`;
  }
  return `${base}-${Date.now()}`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { success } = tripCreateLimiter.check(session.user.id);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const parsed = wizardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, description, locationId, isPublic, coverImageUrl, days } = parsed.data;

    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      return NextResponse.json({ error: 'Location not found.' }, { status: 404 });
    }

    let trip;
    try {
      trip = await prisma.$transaction(async (tx) => {
        const slug = await generateUniqueSlug(tx, title);

        const newTrip = await tx.trip.create({
          data: {
            title,
            slug,
            description: description ?? null,
            locationId,
            isPublic,
            coverImageUrl: coverImageUrl ?? null,
            userId: session.user.id,
          },
        });

        if (days.length > 0) {
          await tx.tripDay.createMany({
            data: days.map((d) => ({
              tripId: newTrip.id,
              dayNumber: d.dayNumber,
              title: d.title,
              description: d.description ?? null,
            })),
          });
        }

        return newTrip;
      });
    } catch (txError) {
      const err = txError as { code?: string; message?: string };
      if (err?.code === 'P2002') {
        return NextResponse.json(
          { error: 'A trip with a similar title already exists.' },
          { status: 409 }
        );
      }
      throw txError;
    }

    return NextResponse.json(
      { trip: { id: trip.id, slug: trip.slug, title: trip.title } },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/trips/wizard]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
