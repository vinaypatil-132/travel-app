import { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TripCard } from '@/components/ui/TripCard';

export const metadata: Metadata = { title: 'My Dashboard' };
export const dynamic = 'force-dynamic';

async function getMyTrips(userId: string) {
  return prisma.trip.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      isPublic: true,
      createdAt: true,
      location: { select: { name: true, country: true } },
      _count: { select: { days: true } },
    },
  });
}

async function getSavedTrips(userId: string) {
  return prisma.savedTrip.findMany({
    where: { userId, trip: { isPublic: true, deletedAt: null } },
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: {
      trip: {
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
      },
    },
  });
}

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const activeTab = tab === 'saved' ? 'saved' : 'my-trips';

  const session = await auth();
  const [myTrips, savedRaw] = await Promise.all([
    getMyTrips(session!.user.id),
    getSavedTrips(session!.user.id),
  ]);

  const savedTrips = savedRaw.map((s) => s.trip);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <Link
          href="/dashboard/trips/new"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          + New Trip
        </Link>
      </div>

      {/* Tabs (URL-driven) */}
      <div className="mb-6 flex gap-1 border-b border-stone-200">
        {[
          { key: 'my-trips', label: `My Trips (${myTrips.length})`, href: '/dashboard' },
          { key: 'saved', label: `Saved (${savedTrips.length})`, href: '/dashboard?tab=saved' },
        ].map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
              ${activeTab === t.key
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* My Trips tab */}
      {activeTab === 'my-trips' && (
        <>
          {myTrips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 py-20 text-center">
              <p className="text-sm text-stone-400">You haven&apos;t created any trips yet.</p>
              <Link
                href="/dashboard/trips/new"
                className="mt-4 inline-block text-sm font-medium text-amber-600 hover:underline"
              >
                Create your first blueprint →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
              {myTrips.map((trip) => (
                <div key={trip.id} className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-900">{trip.title}</p>
                    <p className="text-xs text-stone-400">
                      {trip.location.name}, {trip.location.country} ·{' '}
                      {trip._count.days} {trip._count.days === 1 ? 'day' : 'days'} ·{' '}
                      <span className={trip.isPublic ? 'text-green-600' : 'text-stone-400'}>
                        {trip.isPublic ? 'Public' : 'Private'}
                      </span>
                    </p>
                  </div>
                  <div className="ml-4 flex gap-2 text-xs">
                    <Link
                      href={`/trip/${trip.slug}`}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-stone-600 hover:bg-stone-50"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/trips/${trip.slug}/edit`}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-stone-600 hover:bg-stone-50"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Saved trips tab */}
      {activeTab === 'saved' && (
        <>
          {savedTrips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 py-20 text-center">
              <p className="text-sm text-stone-400">No saved trips yet.</p>
              <Link
                href="/explore"
                className="mt-4 inline-block text-sm font-medium text-amber-600 hover:underline"
              >
                Browse trips to save →
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {savedTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={{ ...trip, createdAt: trip.createdAt.toISOString() }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
