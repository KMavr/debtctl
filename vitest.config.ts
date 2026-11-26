import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      // The CLI entry point only wires commands up and isn't unit tested.
      exclude: ['src/index.ts'],
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
});
