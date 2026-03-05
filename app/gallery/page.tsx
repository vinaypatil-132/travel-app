'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface TripLink {
  title: string;
  slug: string;
}

interface GalleryItem {
  id: string;
  url: string;
  mediaType: 'IMAGE' | 'VIDEO';
  createdAt: string;
  trip: TripLink;
}

export default function GlobalGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Modal State
  const [selectedMedia, setSelectedMedia] = useState<GalleryItem | null>(null);

  const fetchItems = useCallback(async (currentCursor: string | null = null) => {
    try {
      const url = new URL('/api/user/gallery', window.location.origin);
      url.searchParams.set('take', '24');
      if (currentCursor) {
        url.searchParams.set('cursor', currentCursor);
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch gallery');
      
      const data = await res.json();
      
      setItems(prev => currentCursor ? [...prev, ...data.items] : data.items);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(null);
  }, [fetchItems]);

  const loadMore = () => {
    if (!loadingMore && hasMore && cursor) {
      setLoadingMore(true);
      fetchItems(cursor);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold text-stone-900">Your Travel Gallery</h1>
          <p className="text-zinc-400 mt-2">You haven&apos;t uploaded any media yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">Your Travel Gallery</h1>
        <p className="mt-2 text-sm text-stone-600">
          A collection of all the photos and videos you&apos;ve uploaded across all your trips.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 p-12 text-center text-stone-500">
          No media found. Edit a trip to upload photos and videos!
        </div>
      ) : (
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl bg-stone-100 cursor-zoom-in"
              onClick={() => setSelectedMedia(item)}
            >
              {item.mediaType === 'VIDEO' ? (
                <video 
                  src={item.url} 
                  className="w-full object-cover" 
                  muted 
                  playsInline 
                  onMouseEnter={(e) => e.currentTarget.play().catch(()=>{})} 
                  onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                />
              ) : (
                <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                  <Image 
                    src={item.url} 
                    alt={`Photo from ${item.trip.title}`} 
                    fill 
                    className="object-cover transition-transform duration-500 group-hover:scale-105" 
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
              )}
              
              {/* Overlay with Meta */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <Link 
                  href={`/trip/${item.trip.slug}`} 
                  className="text-xs font-medium text-white hover:text-amber-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  📍 {item.trip.title}
                </Link>
                <div className="text-[10px] text-stone-300">
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              {item.mediaType === 'VIDEO' && (
                <div className="pointer-events-none absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasMore && items.length > 0 && (
        <div className="mt-12 flex justify-center">
          <button 
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full border border-stone-200 bg-white px-6 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more memories'}
          </button>
        </div>
      )}

      {/* Lightbox / Modal */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <button 
            className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setSelectedMedia(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          
          <div 
            className="relative flex max-h-full max-w-5xl flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedMedia.mediaType === 'VIDEO' ? (
              <video 
                src={selectedMedia.url} 
                className="max-h-[80vh] w-auto max-w-full rounded-md shadow-2xl" 
                controls 
                autoPlay 
                playsInline 
              />
            ) : (
              <div className="relative h-[80vh] w-[80vw]">
                <Image 
                  src={selectedMedia.url} 
                  alt={`From ${selectedMedia.trip.title}`} 
                  fill
                  unoptimized
                  className="rounded-md shadow-2xl object-contain"
                />
              </div>
            )}
            
            <div className="mt-4 flex w-full items-center justify-between text-white">
              <div>
                <p className="text-sm font-medium">{selectedMedia.trip.title}</p>
                <p className="text-xs text-white/70">{new Date(selectedMedia.createdAt).toLocaleDateString()}</p>
              </div>
              <Link 
                href={`/trip/${selectedMedia.trip.slug}`}
                className="rounded-md bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500/40"
              >
                View Trip →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
