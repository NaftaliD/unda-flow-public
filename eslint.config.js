import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// Physical-direction Tailwind utilities are banned (PLAN.md D2): use logical ones (ms-, pe-, start-, text-start, rounded-s-...).
const PHYSICAL_CLASS =
  '(?:^|[\\s"\'`:])-?(?:m[lr]|p[lr]|left|right|text-left|text-right|float-left|float-right|border-[lr]|rounded-[lr]|rounded-(?:tl|tr|bl|br)|scroll-m[lr]|scroll-p[lr])(?:-|\\b)'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'playwright-report',
      'test-results',
      'src/data/database.types.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Only src/data may talk to Supabase (PLAN.md section 5).
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Import supabase-js only inside src/data/**.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=/${PHYSICAL_CLASS}/]`,
          message:
            'Use logical CSS utilities (ms-, me-, ps-, pe-, start-, end-, text-start, rounded-s-...), not physical ones.',
        },
        {
          selector: `TemplateElement[value.raw=/${PHYSICAL_CLASS}/]`,
          message:
            'Use logical CSS utilities (ms-, me-, ps-, pe-, start-, end-, text-start, rounded-s-...), not physical ones.',
        },
      ],
    },
  },
  {
    files: ['src/data/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'e2e/**', 'src/test/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['*.config.{js,ts}', 'e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
)
