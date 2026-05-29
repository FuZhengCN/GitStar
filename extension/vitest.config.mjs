/** @type {import('vitest').UserConfig} */
export default {
  oxc: false,
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test-setup.ts'],
  },
};
