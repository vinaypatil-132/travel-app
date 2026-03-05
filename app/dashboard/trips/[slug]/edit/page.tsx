'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/Input';
import { MediaUploader } from '@/components/ui/MediaUploader';
import { MediaLightbox } from '@/components/ui/MediaLightbox';

interface Activity {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
}

interface TripDay {
  id: string;
  dayNumber: number;
  title: string;
  description?: string | null;
  activities: Activity[];
}

interface TripMedia {
  id: string;
  url: string;
  mediaType: 'IMAGE' | 'VIDEO';
  visibility: 'PUBLIC' | 'FRIENDS' | 'SELECTED' | 'PRIVATE';
}

interface Trip {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  isPublic: boolean;
  coverImageUrl?: string | null;
  location: { name: string; country: string };
  media: TripMedia[];
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default function EditTripPage({ params }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<TripDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coverLightboxOpen, setCoverLightboxOpen] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState<string | null>(null);
  const [friendPickerMedia, setFriendPickerMedia] = useState<string | null>(null); // mediaId being picked
  const [friends, setFriends] = useState<{ id: string; name?: string | null; email: string }[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  // New day form state
  const [newDayTitle, setNewDayTitle] = useState('');
  const [addingDay, setAddingDay] = useState(false);

  // New activity form state per day
  const [activityForms, setActivityForms] = useState<Record<string, string>>({});

  const fetchTrip = useCallback(async (tripSlug: string) => {
    const [tripRes, daysRes] = await Promise.all([
      fetch(`/api/trips/${tripSlug}`),
      fetch(`/api/trips/${tripSlug}/days`),
    ]);
    if (tripRes.ok) setTrip((await tripRes.json()).trip);
    if (daysRes.ok) setDays((await daysRes.json()).days);
    setLoading(false);
  }, []);

  useEffect(() => {
    params.then(({ slug: s }) => {
      setSlug(s);
      fetchTrip(s);
    });
  }, [params, fetchTrip]);

  async function togglePublic() {
    if (!trip) return;
    setSaving(true);
    const res = await fetch(`/api/trips/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: !trip.isPublic }),
    });
    if (res.ok) setTrip((prev) => prev && { ...prev, isPublic: !prev.isPublic });
    setSaving(false);
  }

  async function deleteTrip() {
    if (!confirm('Delete this trip? This cannot be undone.')) return;
    await fetch(`/api/trips/${slug}`, { method: 'DELETE' });
    router.push('/dashboard');
  }

  async function addDay() {
    if (!newDayTitle.trim()) return;
    setAddingDay(true);
    const nextDayNumber = (days[days.length - 1]?.dayNumber ?? 0) + 1;
    const res = await fetch(`/api/trips/${slug}/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayNumber: nextDayNumber, title: newDayTitle }),
    });
    if (res.ok) {
      const { day } = await res.json();
      setDays((prev) => [...prev, day]);
      setNewDayTitle('');
    }
    setAddingDay(false);
  }

  async function deleteDay(dayId: string) {
    await fetch(`/api/trips/${slug}/days/${dayId}`, { method: 'DELETE' });
    setDays((prev) => prev.filter((d) => d.id !== dayId));
  }

  async function addActivity(day: TripDay) {
    const title = activityForms[day.id]?.trim();
    if (!title) return;
    const orderIndex = (day.activities[day.activities.length - 1]?.orderIndex ?? -1) + 1;
    const res = await fetch(`/api/trips/${slug}/days/${day.id}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, orderIndex }),
    });
    if (res.ok) {
      const { activity } = await res.json();
      setDays((prev) =>
        prev.map((d) =>
          d.id === day.id ? { ...d, activities: [...d.activities, activity] } : d
        )
      );
      setActivityForms((prev) => ({ ...prev, [day.id]: '' }));
    }
  }

  async function deleteActivity(dayId: string, activityId: string) {
    await fetch(`/api/trips/${slug}/days/${dayId}/activities/${activityId}`, {
      method: 'DELETE',
    });
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? { ...d, activities: d.activities.filter((a) => a.id !== activityId) }
          : d
      )
    );
  }

  const handleMediaUploadSuccess = async (url: string, mediaType: 'IMAGE' | 'VIDEO') => {
    if (!trip) return;
    const res = await fetch(`/api/trips/${slug}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, mediaType, visibility: 'PUBLIC' }),
    });
    if (res.ok) {
      const { media } = await res.json();
      setTrip((prev) => prev && { ...prev, media: [...(prev.media || []), media] });
    }
  };

  const handleVisibilityChange = async (mediaId: string, visibility: TripMedia['visibility'], friendIds?: string[]) => {
    setUpdatingVisibility(mediaId);
    try {
      await fetch(`/api/trips/media/${mediaId}/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility, selectedUserIds: friendIds }),
      });
      setTrip((prev) =>
        prev
          ? { ...prev, media: prev.media.map((m) => (m.id === mediaId ? { ...m, visibility } : m)) }
          : prev
      );
    } finally {
      setUpdatingVisibility(null);
    }
  };

  const openFriendPicker = async (mediaId: string) => {
    // Fetch friends list on first open
    if (friends.length === 0) {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends.map((f: { user: { id: string; name?: string | null; email: string } }) => f.user));
      }
    }
    setSelectedFriendIds([]);
    setFriendPickerMedia(mediaId);
  };

  const handleCoverUploadSuccess = async (url: string) => {
    try {
      const res = await fetch(`/api/trips/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl: url }),
      });
      if (!res.ok) throw new Error('Failed to save cover photo');
      
      const { trip: updated } = await res.json();
      setTrip(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleRemoveCover = async () => {
    if (!trip) return;
    try {
      const res = await fetch(`/api/trips/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl: null }),
      });
      if (!res.ok) throw new Error('Failed to remove cover photo');
      
      const { trip: updated } = await res.json();
      setTrip(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  async function deleteMedia(mediaId: string) {
    if (!confirm('Permanently delete this media?')) return;
    
    await fetch(`/api/trips/${slug}/media/${mediaId}`, { method: 'DELETE' });
    
    setTrip((prev) => 
      prev && { ...prev, media: prev.media.filter(m => m.id !== mediaId) }
    );
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-stone-400">Loading trip…</div>
    );
  }

  if (!trip) {
    return (
      <div className="py-20 text-center text-sm text-stone-400">
        Trip not found or you don&apos;t have permission to edit it.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-stone-500 hover:underline">
            ← My Trips
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">{trip.title}</h1>
          <p className="text-xs text-stone-500">
            {trip.location.name}, {trip.location.country}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={togglePublic}
            disabled={saving}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
          >
            {trip.isPublic ? '🔒 Make Private' : '🌍 Make Public'}
          </button>
          <Link
            href={`/trip/${slug}`}
            target="_blank"
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
          >
            Preview →
          </Link>
          <button
            onClick={deleteTrip}
            className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
          >
            Delete trip
          </button>
        </div>
      </div>

      {/* Cover Photo Management */}
      <div className="mb-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-stone-900">Cover Photo</h2>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div 
            className="group relative aspect-video w-full max-w-sm shrink-0 cursor-pointer overflow-hidden rounded-xl bg-stone-100 transition-all hover:ring-2 hover:ring-amber-500 hover:ring-offset-2"
            onClick={() => trip.coverImageUrl && setCoverLightboxOpen(true)}
          >
            {trip.coverImageUrl ? (
              <Image src={trip.coverImageUrl} alt="Cover" fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-stone-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </div>
            )}
            
            {trip.coverImageUrl && (
              <button
                onClick={handleRemoveCover}
                className="absolute right-2 top-2 rounded-full bg-stone-900/60 p-1.5 text-white backdrop-blur-md transition-colors hover:bg-red-500"
                title="Remove cover photo"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            )}
          </div>
          <div className="flex-1">
            <p className="mb-4 text-sm text-stone-500">
              Upload a beautiful cover photo for your trip. This will be the main image shown on the public trip page and exploration cards.
            </p>
            <MediaUploader 
              onUploadSuccess={handleCoverUploadSuccess}
              accept="image/*"
              isCustomizingCover
              cropAspectRatio={16 / 9}
              className="max-w-sm"
              label="Upload new cover"
            />
          </div>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-4">
        {days.map((day) => (
          <div key={day.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">
                Day {day.dayNumber} — {day.title}
              </h3>
              <button
                onClick={() => deleteDay(day.id)}
                className="text-xs text-stone-400 hover:text-red-500"
              >
                Remove day
              </button>
            </div>

            {/* Activities */}
            <ul className="mt-3 space-y-1">
              {day.activities.map((act) => (
                <li
                  key={act.id}
                  className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5"
                >
                  <span className="text-xs text-stone-700">{act.title}</span>
                  <button
                    onClick={() => deleteActivity(day.id, act.id)}
                    className="text-xs text-stone-300 hover:text-red-400"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            {/* Add activity */}
            <div className="mt-3 flex gap-2">
              <Input
                type="text"
                value={activityForms[day.id] ?? ''}
                onChange={(e) =>
                  setActivityForms((prev) => ({ ...prev, [day.id]: e.target.value }))
                }
                placeholder="Add activity…"
                onKeyDown={(e) => e.key === 'Enter' && addActivity(day)}
              />
              <button
                onClick={() => addActivity(day)}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
              >
                Add
              </button>
            </div>
          </div>
        ))}

        {/* Add new day */}
        <div className="rounded-xl border border-dashed border-stone-200 p-4">
          <p className="mb-2 text-xs font-medium text-stone-600">
            + Add Day {(days[days.length - 1]?.dayNumber ?? 0) + 1}
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              value={newDayTitle}
              onChange={(e) => setNewDayTitle(e.target.value)}
              placeholder="Day title (e.g. Arrival & Old Town)"
              onKeyDown={(e) => e.key === 'Enter' && addDay()}
            />
            <button
              onClick={addDay}
              disabled={addingDay}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {addingDay ? '…' : 'Add Day'}
            </button>
          </div>
        </div>
      </div>

      {/* Media & Gallery Management */}
      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-stone-900">
          Trip Media & Gallery
        </h2>
        <p className="mb-6 text-sm text-stone-500">
          Upload photos and videos to attach to this specific trip. Images must be JPEG/PNG/WEBP (≤5MB) and videos MP4/WEBM (≤50MB).
        </p>

        <MediaUploader 
          onUploadSuccess={handleMediaUploadSuccess}
          className="mb-8 max-w-full sm:max-w-sm"
          multiple
        />

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {trip.media?.map((m) => {
            const VISIBILITY_CONFIG = {
              PUBLIC:   { label: 'Public',   icon: '🌍', color: 'bg-emerald-500' },
              FRIENDS:  { label: 'Friends',  icon: '👥', color: 'bg-blue-500' },
              SELECTED: { label: 'Selected', icon: '🔗', color: 'bg-violet-500' },
              PRIVATE:  { label: 'Private',  icon: '🔒', color: 'bg-stone-600' },
            };
            const cfg = VISIBILITY_CONFIG[m.visibility] ?? VISIBILITY_CONFIG.PUBLIC;
            const isUpdating = updatingVisibility === m.id;
            return (
              <div key={m.id} className="group relative aspect-square overflow-hidden rounded-xl bg-stone-100 shadow-sm">
                {m.mediaType === 'VIDEO' ? (
                  <video src={m.url} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <Image src={m.url} alt="Trip media" fill className="object-cover" />
                )}

                {m.mediaType === 'VIDEO' && (
                  <div className="pointer-events-none absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                )}

                {/* Visibility badge — always visible */}
                <div className={`absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white ${cfg.color}`}>
                  <span>{cfg.icon}</span><span>{cfg.label}</span>
                  {isUpdating && <span className="ml-auto opacity-70 animate-spin">⟳</span>}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 opacity-0 transition-all duration-200 group-hover:opacity-100 pb-7">
                  <button
                    onClick={() => deleteMedia(m.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    🗑 Delete
                  </button>
                  <div className="flex flex-wrap justify-center gap-1 px-2">
                    {(['PUBLIC', 'FRIENDS', 'PRIVATE'] as const).map((v) => {
                      const c = VISIBILITY_CONFIG[v];
                      return (
                        <button
                          key={v}
                          disabled={isUpdating || m.visibility === v}
                          onClick={() => handleVisibilityChange(m.id, v)}
                          className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-all ${
                            m.visibility === v ? `${c.color} text-white ring-2 ring-white/40` : 'bg-white/20 text-white hover:bg-white/30'
                          } disabled:opacity-50`}
                        >
                          {c.icon} {c.label}
                        </button>
                      );
                    })}
                    <button
                      disabled={isUpdating}
                      onClick={() => openFriendPicker(m.id)}
                      className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-all ${
                        m.visibility === 'SELECTED' ? `${VISIBILITY_CONFIG.SELECTED.color} text-white ring-2 ring-white/40` : 'bg-white/20 text-white hover:bg-white/30'
                      } disabled:opacity-50`}
                    >
                      🔗 Selected
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {(!trip.media || trip.media.length === 0) && (
            <div className="col-span-full py-8 text-center text-sm text-stone-400">No media uploaded yet.</div>
          )}
        </div>
      </div>

      {/* ── Friend Picker Modal ── */}
      {friendPickerMedia && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <div>
                <h3 className="font-bold text-stone-900">Select Friends</h3>
                <p className="text-xs text-stone-400 mt-0.5">Choose who can see this photo</p>
              </div>
              <button onClick={() => setFriendPickerMedia(null)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-2">
              {friends.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-400">No friends yet. Add friends from the Friends page first.</p>
              ) : (
                friends.map((f) => {
                  const checked = selectedFriendIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFriendIds((prev) => checked ? prev.filter((id) => id !== f.id) : [...prev, f.id])}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        checked ? 'border-violet-500 bg-violet-50' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${checked ? 'bg-violet-500 text-white' : 'bg-stone-100 text-stone-600'}`}>
                        {checked ? '✓' : (f.name || f.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{f.name || 'Unnamed User'}</p>
                        <p className="text-xs text-stone-400 truncate">{f.email}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-stone-100 px-6 py-4 flex gap-3">
              <button onClick={() => setFriendPickerMedia(null)} className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50">
                Cancel
              </button>
              <button
                disabled={selectedFriendIds.length === 0}
                onClick={async () => { await handleVisibilityChange(friendPickerMedia, 'SELECTED', selectedFriendIds); setFriendPickerMedia(null); }}
                className="flex-1 rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-40"
              >
                {selectedFriendIds.length === 0 ? 'Pick friends above' : `Grant to ${selectedFriendIds.length} friend${selectedFriendIds.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {coverLightboxOpen && trip?.coverImageUrl && (
        <MediaLightbox
          media={[{ id: 'cover', url: trip.coverImageUrl, mediaType: 'IMAGE' }]}
          initialIndex={0}
          onClose={() => setCoverLightboxOpen(false)}
        />
      )}
    </div>
  );
}
