import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    lib: {
      entry: 'src/sepviz-alectryon.ts',
      formats: ['es'],
      fileName: () => 'sepviz-alectryon.js',
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
