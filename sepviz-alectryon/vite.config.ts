import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    lib: {
      entry: 'src/sepviz-alectryon.ts',
      formats: ['es'],
      fileName: () => 'sepviz-alectryon.js',
    },
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['d3-graphviz', 'd3'],
  },
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
  },
});
