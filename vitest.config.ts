import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.validation-temp/**',
      '**/test-project/**',
    ],
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
});

