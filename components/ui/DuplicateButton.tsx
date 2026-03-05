'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function DuplicateButton({ tripSlug }: { tripSlug: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!session?.user) return null;

  async function handleDuplicate() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/trips/${tripSlug}/duplicate`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not duplicate trip.');
        return;
      }

      router.push(`/dashboard/trips/${data.trip.slug}/edit`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDuplicate}
        disabled={loading}
        className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
      >
        {loading ? 'Duplicating…' : '📋 Duplicate'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
