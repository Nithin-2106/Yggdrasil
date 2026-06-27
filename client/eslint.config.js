import js            from '@eslint/js'
import globals        from 'globals'
import reactHooks     from 'eslint-plugin-react-hooks'
import reactRefresh   from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Flat config for ESLint 10 + React 19
export default defineConfig([
  // Ignore built output
  globalIgnores(['dist']),

  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals:       globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])