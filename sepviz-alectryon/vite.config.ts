import { defineConfig } from 'vite';
import sourcemaps from 'rollup-plugin-sourcemaps';

export default defineConfig({
  plugins: [sourcemaps()],
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
