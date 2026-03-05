'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MediaLightbox } from './MediaLightbox';

interface MediaItem {
  id: string;
  url: string;
  mediaType: 'IMAGE' | 'VIDEO';
}

interface TripGalleryProps {
  media: MediaItem[];
  title: string;
}

export function TripGallery({ media, title }: TripGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (media.length === 0) return null;

  const displayLimit = 11;
  const initialGrid = media.slice(0, displayLimit + 1);
  const hasMore = media.length > displayLimit + 1;

  return (
    <div className="mt-16">
      <h2 className="mb-6 text-lg font-semibold text-stone-900">Trip Gallery</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {initialGrid.map((m, idx) => {
          const isLastItem = idx === displayLimit && hasMore;
          const remainingCount = media.length - displayLimit;

          return (
            <div 
              key={m.id} 
              onClick={() => setLightboxIndex(idx)}
              className="group relative cursor-pointer aspect-square overflow-hidden rounded-xl bg-stone-100"
            >
              {m.mediaType === 'VIDEO' ? (
                 <video src={m.url} className="h-full w-full object-cover" muted playsInline />
              ) : (
                <Image src={m.url} alt={`Media for ${title}`} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
              )}
              
              {m.mediaType === 'VIDEO' && !isLastItem && (
                <div className="pointer-events-none absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition-opacity group-hover:opacity-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              )}

              {isLastItem && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-[2px] transition-colors hover:bg-black/70">
                   <span className="text-2xl font-bold">+{remainingCount}</span>
                   <span className="text-sm font-medium">more photos</span>
                 </div>
              )}
            </div>
          );
        })}
      </div>

      {lightboxIndex !== null && (
        <MediaLightbox 
          media={media} 
          initialIndex={lightboxIndex} 
          onClose={() => setLightboxIndex(null)} 
        />
      )}
    </div>
  );
}
