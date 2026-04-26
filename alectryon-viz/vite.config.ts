import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    lib: {
      entry: 'src/alectryon-viz.ts',
      formats: ['es'],
      fileName: () => 'alectryon-viz.js',
    },
    sourcemap: true, // for debugging
  },
  optimizeDeps: {
    include: ['d3-graphviz', 'd3'],
  },
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/script/**'],
    },
  },
});
