import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    base44({
      legacySDKImports: true
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Heavy 3D / animation libs — isolated so main app shell stays small
            if (id.includes('three') || id.includes('framer-motion') || id.includes('lenis')) {
              return 'vendor-3d-motion';
            }
            // Charts / data-viz
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
              return 'vendor-charts';
            }
            // Maps
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-maps';
            }
            // PDF / document generation
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            // Rich text editor
            if (id.includes('react-quill') || id.includes('quill')) {
              return 'vendor-editor';
            }
            // Large utility libs
            if (id.includes('moment') || id.includes('lodash')) {
              return 'vendor-utils';
            }
            // React core + router + query — shared across all pages
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('@tanstack/react-query') ||
              id.includes('react/index') ||
              id.includes('scheduler')
            ) {
              return 'vendor-react-core';
            }
            // Radix UI primitives + shadcn-style UI libs
            if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul') || id.includes('embla-carousel')) {
              return 'vendor-ui';
            }
            // Everything else from node_modules -> generic vendor chunk
            return 'vendor-misc';
          }
        },
      },
    },
  },
});