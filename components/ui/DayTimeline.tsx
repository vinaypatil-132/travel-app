interface Activity {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
}

interface Day {
  id: string;
  dayNumber: number;
  title: string;
  description?: string | null;
  activities: Activity[];
}

interface DayTimelineProps {
  days: Day[];
}

export function DayTimeline({ days }: DayTimelineProps) {
  if (days.length === 0) {
    return (
      <p className="text-sm text-stone-400 italic">No days added to this trip yet.</p>
    );
  }

  return (
    <ol className="relative space-y-8 border-l-2 border-amber-200 pl-6">
      {days.map((day) => (
        <li key={day.id} className="relative">
          {/* Timeline dot */}
          <span className="absolute -left-[29px] flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white ring-4 ring-stone-50">
            {day.dayNumber}
          </span>

          {/* Day card */}
          <div className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-900">
              Day {day.dayNumber} — {day.title}
            </h3>

            {day.description && (
              <p className="mt-1 text-xs text-stone-500">{day.description}</p>
            )}

            {/* Activities */}
            {day.activities.length > 0 && (
              <ul className="mt-3 space-y-2">
                {day.activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-start gap-2 rounded-lg bg-stone-50 p-2"
                  >
                    <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                    <div>
                      <p className="text-xs font-medium text-stone-800">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-stone-500">{activity.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
