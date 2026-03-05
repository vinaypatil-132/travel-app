'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-stone-900">
          <span className="text-xl">🗺️</span>
          <span className="text-lg tracking-tight">Travel Blueprint</span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/explore"
            className={`text-sm font-medium transition-colors hover:text-amber-600 ${
              isActive('/explore') ? 'text-amber-600' : 'text-stone-600'
            }`}
          >
            Explore
          </Link>
          {session && (
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors hover:text-amber-600 ${
                pathname.startsWith('/dashboard') ? 'text-amber-600' : 'text-stone-600'
              }`}
            >
              My Trips
            </Link>
          )}
          {session && (
            <Link
              href="/friends"
              className={`text-sm font-medium transition-colors hover:text-amber-600 ${
                pathname.startsWith('/friends') ? 'text-amber-600' : 'text-stone-600'
              }`}
            >
              Friends
            </Link>
          )}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {status === 'loading' ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-stone-100" />
          ) : session ? (
            <>
              <span className="hidden text-sm text-stone-500 sm:block">
                {session.user.name ?? session.user.email}
              </span>
              <button
                onClick={async () => {
                  await signOut({ redirect: false });
                  window.location.href = '/login';
                }}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
