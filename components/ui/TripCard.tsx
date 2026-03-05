import Link from 'next/link';

interface Trip {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  coverImageUrl?: string | null;
  createdAt: string;
  user: { id: string; name?: string | null };
  location: { id: string; name: string; country: string; slug: string };
  _count: { days: number };
}

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white transition-shadow hover:shadow-sm">
      {/* Cover */}
      {trip.coverImageUrl ? (
        <div
          className="h-40 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${trip.coverImageUrl})` }}
        />
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-amber-50 to-stone-100" />
      )}

      <div className="p-4">
        {/* Location — links to location page */}
        <Link
          href={`/locations/${trip.location.slug}`}
          className="inline-block text-xs font-medium text-amber-600 hover:underline"
        >
          📍 {trip.location.name}, {trip.location.country}
        </Link>

        {/* Title */}
        <Link href={`/trip/${trip.slug}`} className="group mt-1 block">
          <h3 className="line-clamp-2 text-sm font-semibold text-stone-900 group-hover:text-amber-700">
            {trip.title}
          </h3>
        </Link>

        {/* Description */}
        {trip.description && (
          <p className="mt-1 line-clamp-2 text-xs text-stone-500">{trip.description}</p>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between text-xs text-stone-400">
          <span>by {trip.user.name ?? 'Traveller'}</span>
          <span>{trip._count.days} {trip._count.days === 1 ? 'day' : 'days'}</span>
        </div>
      </div>
    </div>
  );
}
