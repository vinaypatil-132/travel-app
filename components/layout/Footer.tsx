import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-stone-700">
          <span>🗺️</span>
          <span className="text-sm font-semibold">Travel Blueprint</span>
        </Link>
        <p className="text-xs text-stone-400">
          &copy; 2026 Travel Blueprint. All rights reserved.
        </p>
        <nav className="flex gap-4 text-xs text-stone-500">
          <Link href="/explore" className="hover:text-stone-800">
            Explore
          </Link>
        </nav>
      </div>
    </footer>
  );
}
