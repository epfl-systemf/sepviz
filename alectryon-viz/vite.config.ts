import { defineConfig } from 'vite';

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
