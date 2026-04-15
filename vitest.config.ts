import peggyPlugin from './vite-plugin-peggy';

export default {
  plugins: [peggyPlugin()],
  test: {
    root: './tests',
    include: ['**/*.test.ts'],
  },
};
