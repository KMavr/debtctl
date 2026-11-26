import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default defineConfig([
  ...tseslint.configs.recommended,
  globalIgnores(['dist/**', 'node_modules/**', 'coverage/**']),
  {
    rules: {
      'no-nested-ternary': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration > FunctionDeclaration',
          message: 'Declare the function first, then export default as a separate line at the end.',
        },
      ],
    },
  },
  prettierConfig,
]);
