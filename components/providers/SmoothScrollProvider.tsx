'use client';

import { useEffect, ReactNode } from 'react';
import Lenis from 'lenis';

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Respect user's reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (prefersReducedMotion.matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // standard easing
      smoothWheel: true,
      wheelMultiplier: 1,
    });

    // Provide lenis instance to framer-motion or global ticker if needed
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    
    const rafId = requestAnimationFrame(raf);

    // Hydration/unmount safety cleanup
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
