'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface MediaItem {
  id: string;
  url: string;
  mediaType: 'IMAGE' | 'VIDEO';
}

interface MediaLightboxProps {
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export function MediaLightbox({ media, initialIndex, onClose }: MediaLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  const handleNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % media.length);
  }, [media.length]);

  const handlePrev = useCallback(() => {
    setIndex((prev) => (prev - 1 + media.length) % media.length);
  }, [media.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, handleNext, handlePrev]);

  if (!media.length) return null;

  const currentMedia = media[index];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-[101] flex h-10 w-10 items-center justify-center rounded-full bg-stone-800/50 text-white transition-colors hover:bg-stone-700/80"
          aria-label="Close"
        >
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        {media.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 z-[101] flex h-12 w-12 items-center justify-center rounded-full bg-stone-800/50 text-white transition-colors hover:bg-stone-700/80 hover:scale-105 active:scale-95"
              aria-label="Previous"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 z-[101] flex h-12 w-12 items-center justify-center rounded-full bg-stone-800/50 text-white transition-colors hover:bg-stone-700/80 hover:scale-105 active:scale-95"
              aria-label="Next"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </>
        )}

        <div className="absolute top-4 left-4 z-[101] text-sm font-medium text-stone-400">
          {index + 1} / {media.length}
        </div>

        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative flex h-[85vh] w-[90vw] items-center justify-center"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50) handleNext();
            if (info.offset.x > 50) handlePrev();
          }}
        >
          {currentMedia.mediaType === 'VIDEO' ? (
            <video 
              src={currentMedia.url} 
              className="max-h-full max-w-full rounded-lg object-contain" 
              controls 
              autoPlay
            />
          ) : (
            <div className="relative h-full w-full">
               <Image 
                src={currentMedia.url} 
                alt={`Media ${index + 1}`} 
                fill 
                className="object-contain" 
                sizes="90vw"
                priority
               />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
