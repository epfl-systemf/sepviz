import { defineConfig } from 'vite';
import peggyPlugin from './vite-plugin-peggy';

export default defineConfig({
  plugins: [peggyPlugin()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    lib: {
      entry: 'src/alectryon-viz.ts',
      formats: ['es'],
      fileName: () => 'alectryon-viz.js',
      cssFileName: 'sep',
    },
  },
  optimizeDeps: {
    include: ['d3-graphviz', 'd3'],
  },
  server: {
    watch: {
      ignored: [
        '**/.direnv/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/script/**',
      ],
    },
  },
});
