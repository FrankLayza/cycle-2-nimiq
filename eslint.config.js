import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', 'spike/**', 'design/**'] },
  ...tseslint.configs.recommended,
);
