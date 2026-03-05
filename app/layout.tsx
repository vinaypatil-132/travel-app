import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'Travel Blueprint – Plan, Share & Discover Itineraries',
    template: '%s | Travel Blueprint',
  },
  description:
    'Create structured day-wise travel itineraries, share them with the world, and discover blueprints from other travellers.',
  keywords: ['travel', 'itinerary', 'trip planner', 'travel journal', 'travel blueprint'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXTAUTH_URL,
    siteName: 'Travel Blueprint',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-stone-50 text-stone-900 antialiased">
        <SessionProvider>
          <SmoothScrollProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </SmoothScrollProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
