'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { MediaUploader } from '@/components/ui/MediaUploader';
import Image from 'next/image';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Location {
  id: string;
  name: string;
  country: string;
}

interface DayInput {
  dayNumber: number;
  title: string;
  description: string;
}

interface FormBasics {
  title: string;
  description: string;
  locationId: string;
  isPublic: boolean;
  coverImageUrl?: string;
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepBasics({
  form,
  locations,
  onChange,
  onNext,
}: {
  form: FormBasics;
  locations: Location[];
  onChange: (f: Partial<FormBasics>) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 3) e.title = 'Title must be at least 3 characters.';
    if (!form.locationId) e.locationId = 'Please select a destination.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="title" className="block text-xs font-medium text-stone-700">
          Trip title <span className="text-red-400">*</span>
        </label>
        <Input
          id="title"
          type="text"
          maxLength={200}
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. 5 Days in Kyoto"
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-xs font-medium text-stone-700">
          Description <span className="text-stone-400">(optional)</span>
        </label>
        <Textarea
          id="description"
          rows={3}
          maxLength={2000}
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="A quick summary of your trip…"
        />
      </div>

      <div>
        <label htmlFor="locationId" className="block text-xs font-medium text-stone-700">
          Destination <span className="text-red-400">*</span>
        </label>
        <Select
          id="locationId"
          value={form.locationId}
          onChange={(e) => onChange({ locationId: e.target.value })}
        >
          <option value="">Select a destination…</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}, {loc.country}
            </option>
          ))}
        </Select>
        {errors.locationId && <p className="mt-1 text-xs text-red-500">{errors.locationId}</p>}
      </div>

      <div className="flex items-center gap-3">
        <input
          id="isPublic"
          type="checkbox"
          checked={form.isPublic}
          onChange={(e) => onChange({ isPublic: e.target.checked })}
          className="h-4 w-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400 focus:border-amber-400"
        />
        <label htmlFor="isPublic" className="text-sm text-stone-700">
          Make this trip public
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-2">
          Cover Photo <span className="text-stone-400">(optional)</span>
        </label>
        {form.coverImageUrl ? (
          <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-xl border border-stone-200">
            <Image src={form.coverImageUrl} alt="Cover" fill className="object-cover" />
            <button 
              type="button" 
              onClick={() => onChange({ coverImageUrl: '' })}
              className="absolute top-2 right-2 rounded-full bg-stone-900/50 p-1.5 text-white hover:bg-stone-900/80"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        ) : (
          <MediaUploader
            accept="image/*"
            isCustomizingCover={true}
            cropAspectRatio={16 / 9}
            label="Upload trip cover photo"
            onUploadSuccess={(url) => onChange({ coverImageUrl: url })}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => validate() && onNext()}
        className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
      >
        Next: Add Days →
      </button>
    </div>
  );
}

function StepDays({
  days,
  onAdd,
  onRemove,
  onBack,
  onNext,
}: {
  days: DayInput[];
  onAdd: (d: DayInput) => void;
  onRemove: (dayNumber: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [dayTitle, setDayTitle] = useState('');
  const [dayDesc, setDayDesc] = useState('');
  const [error, setError] = useState('');

  function addDay() {
    if (!dayTitle.trim()) { setError('Day title is required.'); return; }
    setError('');
    onAdd({ dayNumber: days.length + 1, title: dayTitle.trim(), description: dayDesc.trim() });
    setDayTitle('');
    setDayDesc('');
  }

  function validateAndNext() {
    if (days.length === 0) { setError('Add at least one day before continuing.'); return; }
    onNext();
  }

  return (
    <div className="space-y-4">
      {/* Existing days */}
      {days.length > 0 && (
        <ul className="space-y-2">
          {days.map((d) => (
            <li key={d.dayNumber} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
              <span className="text-sm text-stone-800">
                <span className="font-medium text-amber-700">Day {d.dayNumber}</span> — {d.title}
              </span>
              <button
                type="button"
                onClick={() => onRemove(d.dayNumber)}
                className="text-xs text-stone-400 hover:text-red-500"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add day form */}
      <div className="rounded-xl border border-dashed border-stone-200 p-4 space-y-3">
        <p className="text-xs font-medium text-stone-600">+ Day {days.length + 1}</p>
        <Input
          type="text"
          value={dayTitle}
          onChange={(e) => setDayTitle(e.target.value)}
          placeholder="Day title (e.g. Arrival & Old Town)"
        />
        <Textarea
          rows={2}
          value={dayDesc}
          onChange={(e) => setDayDesc(e.target.value)}
          placeholder="Day description (optional)"
        />
        <button
          type="button"
          onClick={addDay}
          className="rounded-lg bg-stone-800 px-4 py-2 text-xs font-medium text-white hover:bg-stone-700"
        >
          Add Day
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm text-stone-600 hover:bg-stone-50">
          ← Back
        </button>
        <button type="button" onClick={validateAndNext}
          className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">
          Review & Publish →
        </button>
      </div>
    </div>
  );
}

function StepReview({
  basics,
  days,
  locationName,
  onBack,
  onPublish,
  publishing,
  error,
}: {
  basics: FormBasics;
  days: DayInput[];
  locationName: string;
  onBack: () => void;
  onPublish: () => void;
  publishing: boolean;
  error: string;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-stone-100 bg-stone-50 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-stone-900">{basics.title}</h3>
        <p className="text-xs text-stone-500">📍 {locationName}</p>
        {basics.description && <p className="text-xs text-stone-600">{basics.description}</p>}
        <p className="text-xs text-stone-400">
          {days.length} {days.length === 1 ? 'day' : 'days'} ·{' '}
          <span className={basics.isPublic ? 'text-green-600' : 'text-stone-400'}>
            {basics.isPublic ? 'Public' : 'Private'}
          </span>
        </p>
      </div>

      <ul className="space-y-1">
        {days.map((d) => (
          <li key={d.dayNumber} className="flex items-start gap-2 text-xs text-stone-600">
            <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full bg-amber-100 text-center text-amber-700 font-bold text-[10px] leading-4">
              {d.dayNumber}
            </span>
            <span><span className="font-medium">{d.title}</span>{d.description ? ` — ${d.description}` : ''}</span>
          </li>
        ))}
      </ul>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm text-stone-600 hover:bg-stone-50">
          ← Back
        </button>
        <button type="button" onClick={onPublish} disabled={publishing}
          className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
          {publishing ? 'Publishing…' : '🚀 Publish Trip'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const STEPS = ['Basics', 'Days', 'Review'] as const;

export default function NewTripPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  const [basics, setBasics] = useState<FormBasics>({
    title: '',
    description: '',
    locationId: '',
    isPublic: false,
  });

  const [days, setDays] = useState<DayInput[]>([]);

  // Load locations once when component mounts
  const loadLocations = useCallback(async () => {
    if (locationsLoaded) return;
    const res = await fetch('/api/locations');
    const data = await res.json();
    setLocations(data.locations ?? []);
    setLocationsLoaded(true);
  }, [locationsLoaded]);

  // Run on first render
  if (!locationsLoaded) loadLocations();

  function addDay(day: DayInput) {
    setDays((prev) => [...prev, day]);
  }

  function removeDay(dayNumber: number) {
    setDays((prev) =>
      prev
        .filter((d) => d.dayNumber !== dayNumber)
        .map((d, i) => ({ ...d, dayNumber: i + 1 })) // re-number
    );
  }

  async function publish() {
    setPublishing(true);
    setPublishError('');

    try {
      const res = await fetch('/api/trips/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...basics, days }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPublishError(data.error ?? 'Failed to create trip. Please try again.');
        return;
      }

      router.push(`/dashboard/trips/${data.trip.slug}/edit`);
    } catch {
      setPublishError('Network error. Please try again.');
    } finally {
      setPublishing(false);
    }
  }

  const selectedLocation = locations.find((l) => l.id === basics.locationId);

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/dashboard" className="text-xs text-stone-500 hover:underline">
          ← My Trips
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">New Trip</h1>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
              ${i < step ? 'bg-amber-500 text-white' : i === step ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400' : 'bg-stone-100 text-stone-400'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${i === step ? 'font-medium text-stone-800' : 'text-stone-400'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-stone-200" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        {step === 0 && (
          <StepBasics
            form={basics}
            locations={locations}
            onChange={(f) => setBasics((prev) => ({ ...prev, ...f }))}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepDays
            days={days}
            onAdd={addDay}
            onRemove={removeDay}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepReview
            basics={basics}
            days={days}
            locationName={selectedLocation ? `${selectedLocation.name}, ${selectedLocation.country}` : '—'}
            onBack={() => setStep(1)}
            onPublish={publish}
            publishing={publishing}
            error={publishError}
          />
        )}
      </div>
    </div>
  );
}
