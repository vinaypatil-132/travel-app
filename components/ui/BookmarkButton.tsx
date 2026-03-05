'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BookmarkButtonProps {
  tripSlug: string;
  initialSaved: boolean;
}

/**
 * Rendered only by the server page when:
 *   - User is authenticated
 *   - User does not own the trip
 * This component does NOT do its own session/ownership check — the server page owns that logic.
 * Doing useSession() here would cause the button to flash-hide on initial render
 * because useSession() returns status:'loading' (session=null) during hydration.
 */
export function BookmarkButton({ tripSlug, initialSaved }: BookmarkButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function toggle() {
    setLoading(true);
    setMessage('');

    const optimisticSaved = !saved;
    setSaved(optimisticSaved); // Optimistic update

    try {
      const res = await fetch(`/api/trips/${tripSlug}/save`, {
        method: optimisticSaved ? 'POST' : 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          // Already saved in DB — keep state as saved, show message
          setSaved(true);
          setMessage('Already saved.');
        } else {
          // Any other error — rollback optimistic update
          setSaved(!optimisticSaved);
          setMessage(data.error ?? 'Could not update bookmark.');
        }
      } else {
        router.refresh();
      }
    } catch {
      setSaved(!optimisticSaved); // Network error — rollback
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={loading}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50
          ${
            saved
              ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
      >
        {saved ? '🔖 Saved' : '🔖 Save trip'}
      </button>
      {message && <p className="text-xs text-red-500">{message}</p>}
    </div>
  );
}
