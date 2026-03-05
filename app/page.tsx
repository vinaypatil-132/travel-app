import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { TripCard } from '@/components/ui/TripCard';
import { HeroContent } from '@/components/home/HeroContent';

export const metadata: Metadata = {
  title: 'Travel Blueprint – Plan, Share & Discover Itineraries',
  description:
    'Create structured day-wise travel itineraries, share them publicly, and discover blueprints from real travellers.',
};

export const dynamic = 'force-dynamic';

async function getFeaturedTrips() {
  return prisma.trip.findMany({
    where: { isPublic: true, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 6,
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
  });
}

async function getPopularLocations() {
  return prisma.location.findMany({
    take: 6,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { trips: { where: { isPublic: true, deletedAt: null } } },
      },
    },
  });
}

export default async function HomePage() {
  const [trips, locations] = await Promise.all([getFeaturedTrips(), getPopularLocations()]);
  type LocationType = Awaited<ReturnType<typeof getPopularLocations>>[number];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 px-4 py-24 sm:px-6 lg:px-8">
        {/* Hero Content includes the 3D Scene internally now */}
        <div className="relative z-10 mx-auto max-w-4xl text-center md:text-left">
          <HeroContent />
        </div>
      </section>

      {/* Featured trips */}
      {trips.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-900">Recently Published</h2>
              <p className="mt-1 text-sm text-stone-500">Fresh itineraries from the community</p>
            </div>
            <Link href="/explore" className="text-sm font-medium text-amber-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip: Awaited<ReturnType<typeof getFeaturedTrips>>[number]) => (
              <TripCard
                key={trip.id}
                trip={{
                  ...trip,
                  createdAt: new Date(trip.createdAt).toISOString(),
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Locations */}
      {locations.length > 0 && (
        <section className="bg-stone-100 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-8 text-xl font-bold text-stone-900">Popular Destinations</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((loc: LocationType) => (
                <Link
                  key={loc.id}
                  href={`/api/locations/${loc.slug}`}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-sm"
                >
                  <div>
                    <p className="font-medium text-stone-800">{loc.name}</p>
                    <p className="text-xs text-stone-500">{loc.country}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                    {loc._count.trips} trips
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-stone-900">
          Ready to share your next adventure?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-stone-500">
          Join thousands of travellers who use Travel Blueprint to plan, document, and share their
          journeys.
        </p>
        <Link
          href="/register"
          className="mt-6 inline-block rounded-xl bg-amber-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
        >
          Create your first blueprint
        </Link>
      </section>
    </>
  );
}
