'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';

// SSR-safe Three.js dynamic import with a lightweight visual fallback
const HeroScene = dynamic(() => import('@/components/3d/HeroScene'), { 
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-32 w-32 animate-pulse rounded-full bg-amber-200/20" />
    </div>
  )
});

export function HeroContent() {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.15, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as const },
    },
  };

  return (
    <>
      {/* Absolute 3D Interactive Background */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-60 mix-blend-multiply md:pointer-events-auto md:justify-end md:pr-20">
        <div className="h-[400px] w-full max-w-lg md:h-[600px]">
          <HeroScene />
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-4xl"
      >
      <motion.span
        variants={itemVariants}
        className="inline-block rounded-full bg-amber-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-amber-700 backdrop-blur-sm"
      >
        Your Travel Blueprint
      </motion.span>
      
      <motion.h1
        variants={itemVariants}
        className="mt-4 text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl lg:text-7xl"
      >
        Plan Trips. Share Stories. Webhook<br />
        <span className="text-amber-600">Inspire Others.</span>
      </motion.h1>
      
      <motion.p
        variants={itemVariants}
        className="mt-6 max-w-2xl text-base text-stone-600 sm:text-lg md:text-xl"
      >
        Build structured day-by-day travel itineraries, publish them publicly, and discover blueprints from travellers around the world.
      </motion.p>
      
      <motion.div
        variants={itemVariants}
        className="mt-10 flex flex-wrap items-center gap-4"
      >
        <Link
          href="/register"
          className="rounded-xl bg-amber-500 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-amber-500/20 transition-all hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-amber-500/30"
        >
          Start planning for free
        </Link>
        <Link
          href="/explore"
          className="rounded-xl border border-stone-200 bg-white/50 px-8 py-4 text-sm font-semibold text-stone-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
        >
          Browse trips
        </Link>
      </motion.div>
    </motion.div>
    </>
  );
}
