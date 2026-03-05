import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { DayTimeline } from '@/components/ui/DayTimeline';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { DuplicateButton } from '@/components/ui/DuplicateButton';
import { TripGallery } from '@/components/ui/TripGallery';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const trip = await prisma.trip.findFirst({
    where: { slug, deletedAt: null },
    select: {
      title: true,
      description: true,
      coverImageUrl: true,
      location: { select: { name: true, country: true } },
    },
  });

  if (!trip) return { title: 'Trip Not Found' };

  const title = `${trip.title} | Travel Blueprint`;
  const description =
    trip.description ??
    `A travel itinerary for ${trip.location.name}, ${trip.location.country}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: trip.coverImageUrl ? [{ url: trip.coverImageUrl }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: trip.coverImageUrl ? [trip.coverImageUrl] : [],
    },
  };
}

export default async function TripDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();

  const trip = await prisma.trip.findFirst({
    where: { slug, deletedAt: null },
    include: {
      user: { select: { id: true, name: true } },
      location: { select: { id: true, name: true, country: true, slug: true } },
      media: { orderBy: { orderIndex: 'asc' } },
      days: {
        orderBy: { dayNumber: 'asc' },
        include: {
          activities: { orderBy: { orderIndex: 'asc' } },
        },
      },
    },
  });

  if (!trip) return notFound();

  const userId = session?.user?.id;
  const isOwner = userId === trip.user.id;
  if (!trip.isPublic && !isOwner) return notFound();

  // ── Media Visibility Filtering ──────────────────────────────────────────
  // Owners see everything. Non-owners get filtered by visibility rules.
  let visibleMedia = trip.media;
  if (!isOwner) {
    let isFriend = false;
    if (userId) {
      const friendship = await prisma.userFriend.findFirst({
        where: { userId: trip.user.id, friendId: userId, status: 'ACCEPTED' },
        select: { id: true },
      });
      isFriend = !!friendship;
    }
    const selectedMediaIds = userId
      ? await prisma.mediaAccess
          .findMany({ where: { userId }, select: { mediaId: true } })
          .then((rows) => new Set(rows.map((r) => r.mediaId)))
      : new Set<string>();

    visibleMedia = trip.media.filter((m) => {
      if (m.visibility === 'PUBLIC') return true;
      if (m.visibility === 'FRIENDS' && isFriend) return true;
      if (m.visibility === 'SELECTED' && selectedMediaIds.has(m.id)) return true;
      return false;
    });
  }

  // Check if current user has saved this trip
  let isSaved = false;
  if (userId && !isOwner) {
    const saved = await prisma.savedTrip.findUnique({
      where: {
        userId_tripId: { userId: userId, tripId: trip.id },
      },
    });
    isSaved = !!saved;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Cover image */}
      {trip.coverImageUrl && (
        <div className="relative mb-8 h-72 w-full overflow-hidden rounded-2xl bg-stone-100">
          <Image src={trip.coverImageUrl} alt={trip.title} fill className="object-cover" />
        </div>
      )}

      {/* Location breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-xs text-stone-500">
        <Link href={`/locations/${trip.location.slug}`} className="hover:underline">
          📍 {trip.location.name}, {trip.location.country}
        </Link>
        {!trip.isPublic && (
          <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
            Private
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-stone-900">{trip.title}</h1>

      {/* Author + actions row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-stone-500">
          by{' '}
          <span className="font-medium text-stone-700">{trip.user.name ?? 'Traveller'}</span>
          {' · '}
          {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {userId && !isOwner && (
            <BookmarkButton
              tripSlug={trip.slug}
              initialSaved={isSaved}
            />
          )}

          {/* Duplicate: for public trips or the owner */}
          {userId && (trip.isPublic || isOwner) && (
            <DuplicateButton tripSlug={trip.slug} />
          )}

          {/* Edit: owner only */}
          {isOwner && (
            <Link
              href={`/dashboard/trips/${trip.slug}/edit`}
              className="rounded-lg border border-stone-200 px-4 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              Edit trip
            </Link>
          )}
        </div>
      </div>

      {/* Description */}
      {trip.description && (
        <p className="mt-6 text-sm leading-relaxed text-stone-600">{trip.description}</p>
      )}

      {/* Day timeline */}
      <div className="mt-10">
        <h2 className="mb-6 text-lg font-semibold text-stone-900">Itinerary</h2>
        <DayTimeline days={trip.days} />
      </div>

      {/* Trip Gallery */}
      <TripGallery media={visibleMedia} title={trip.title} />
    </div>
  );
}
