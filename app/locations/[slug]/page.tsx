import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { TripCard } from '@/components/ui/TripCard';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const LIMIT = 12;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loc = await prisma.location.findFirst({
    where: { slug },
    select: { name: true, country: true, coverImageUrl: true },
  });

  if (!loc) return { title: 'Location Not Found' };

  const title = `${loc.name}, ${loc.country} – Travel Blueprints`;
  const description = `Browse travel itineraries and blueprints for ${loc.name}, ${loc.country}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: loc.coverImageUrl ? [{ url: loc.coverImageUrl }] : [],
    },
  };
}

export default async function LocationPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const skip = (page - 1) * LIMIT;

  const location = await prisma.location.findFirst({ where: { slug } });
  if (!location) return notFound();

  const where = { locationId: location.id, isPublic: true, deletedAt: null };

  const [trips, total] = await prisma.$transaction([
    prisma.trip.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: LIMIT,
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

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Cover */}
      {location.coverImageUrl && (
        <div className="relative mb-8 h-48 w-full overflow-hidden rounded-2xl bg-stone-100">
          <Image src={location.coverImageUrl} alt={location.name} fill className="object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <Link href="/explore" className="text-xs text-stone-500 hover:underline">
          ← All Destinations
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">{location.name}</h1>
        <p className="text-sm text-stone-500">{location.country}</p>
        <p className="mt-1 text-xs text-stone-400">{total} public blueprints</p>
      </div>

      {/* Trip grid */}
      {trips.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={{ ...trip, createdAt: trip.createdAt.toISOString() }}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-stone-400">No public trips for this location yet.</p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {page > 1 && (
            <a
              href={`/locations/${slug}?page=${page - 1}`}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            >
              ← Previous
            </a>
          )}
          <span className="text-xs text-stone-400">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a
              href={`/locations/${slug}?page=${page + 1}`}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
