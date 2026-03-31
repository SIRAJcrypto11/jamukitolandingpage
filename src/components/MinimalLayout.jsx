import React, { useEffect } from "react";
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import ErrorBoundary from '@/components/utils/ErrorBoundary';
import NetworkDetector from '@/components/utils/NetworkDetector';
import { Toaster } from "@/components/ui/toaster";
import { motion, AnimatePresence } from "framer-motion";

/**
 * MinimalLayout for Jamu Kito Landing Page
 * Focus: Instant load, smooth scrolling, and zero bloat.
 */
export default function MinimalLayout({ children }) {
  useEffect(() => {
    // Initialize Lenis for premium smooth scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <ErrorBoundary>
      <NetworkDetector>
        <div className="min-h-screen bg-white selection:bg-green-100 selection:text-green-900 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.main
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {children}
            </motion.main>
          </AnimatePresence>
          <Toaster />
        </div>
      </NetworkDetector>
    </ErrorBoundary>
  );
}
