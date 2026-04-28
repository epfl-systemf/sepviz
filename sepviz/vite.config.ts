import { defineConfig } from 'vite';
import peggyPlugin from './vite-plugin-peggy';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    peggyPlugin(),
    dts({
      include: ['src'],
      outDir: 'dist',
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    lib: {
      entry: 'src/sepviz.ts',
      formats: ['es'],
      fileName: () => 'sepviz.js',
    },
    rollupOptions: {
      external: ['d3', 'd3-graphviz', /^d3-/, /^@codemirror\//],
    },
  },
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
  },
});
