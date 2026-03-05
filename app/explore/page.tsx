import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { TripCard } from '@/components/ui/TripCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; locationSlug?: string; page?: string }>;
}): Promise<Metadata> {
  const { search, locationSlug } = await searchParams;
  const filter = locationSlug
    ? `in ${locationSlug.replace(/-/g, ' ')}`
    : search
    ? `matching "${search}"`
    : 'from around the world';
  return {
    title: 'Explore Trips',
    description: `Browse travel itineraries ${filter}.`,
    openGraph: {
      title: 'Explore Trips | Travel Blueprint',
      description: `Browse travel itineraries ${filter}.`,
    },
  };
}

interface Props {
  searchParams: Promise<{ page?: string; search?: string; locationSlug?: string }>;
}

const LIMIT = 12;

export default async function ExplorePage({ searchParams }: Props) {
  const { page: pageParam, search = '', locationSlug = '' } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const skip = (page - 1) * LIMIT;

  const where = {
    isPublic: true,
    deletedAt: null,
    ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    ...(locationSlug ? { location: { slug: locationSlug } } : {}),
  };

  const [trips, total, locations] = await prisma.$transaction([
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
    prisma.location.findMany({ orderBy: { name: 'asc' }, select: { slug: true, name: true, country: true } }),
  ]);

  const totalPages = Math.ceil(total / LIMIT);

  function buildUrl(params: Record<string, string>) {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.locationSlug) q.set('locationSlug', params.locationSlug);
    if (params.page && params.page !== '1') q.set('page', params.page);
    const str = q.toString();
    return `/explore${str ? `?${str}` : ''}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Explore Trips</h1>
        <p className="mt-1 text-sm text-stone-500">{total} itineraries published by travellers</p>
      </div>

      {/* Filters */}
      <form method="GET" action="/explore" className="mb-8 flex flex-wrap gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search by title…"
          className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        />
        <select
          name="locationSlug"
          defaultValue={locationSlug}
          className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        >
          <option value="">All destinations</option>
          {locations.map((loc) => (
            <option key={loc.slug} value={loc.slug}>
              {loc.name}, {loc.country}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Filter
        </button>
        {(search || locationSlug) && (
          <a
            href="/explore"
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-500 hover:bg-stone-50"
          >
            Clear
          </a>
        )}
      </form>

      {/* Active filter badges */}
      {locationSlug && (
        <p className="mb-4 text-xs text-stone-500">
          Showing trips in{' '}
          <span className="font-medium text-stone-700">
            {locations.find((l) => l.slug === locationSlug)?.name ?? locationSlug}
          </span>
        </p>
      )}

      {/* Grid */}
      {trips.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={{ ...trip, createdAt: trip.createdAt.toISOString() }} />
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-stone-400">No trips found. Try a different filter.</p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {page > 1 && (
            <a
              href={buildUrl({ search, locationSlug, page: String(page - 1) })}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            >
              ← Previous
            </a>
          )}
          <span className="text-xs text-stone-400">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a
              href={buildUrl({ search, locationSlug, page: String(page + 1) })}
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
