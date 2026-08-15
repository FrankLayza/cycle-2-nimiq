import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/*.d.ts',
      '**/spike/**',
      '**/design/**',
    ],
  },
  ...tseslint.configs.recommended,
);
