import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      '.lpc-cache',
      'public/game',
      'tiled/extracted',
      // Deno, not Node: npm:/jsr: specifiers and a global `Deno` that this
      // config's resolver and globals know nothing about. Lint those with
      // `deno lint` instead.
      'supabase/functions',
    ],
  },

  // ─── App source ────────────────────────────────────────────────────
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // The service worker runs off-main-thread: no `window`/`document`, but it
  // does get `self`, `clients`, and the push/notification event types.
  {
    files: ['src/sw.ts'],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },

  // ─── Build + asset-pipeline scripts ────────────────────────────────
  {
    files: ['scripts/**/*.mjs', 'vite.config.ts'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
);
