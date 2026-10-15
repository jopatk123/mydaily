module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // No TypeScript in this project — prop-types validation is redundant
    'react/prop-types': 'off',
    // 有效行数（跳过空行和注释）超过 800 时阻断 CI。
    'max-lines': ['error', { max: 800, skipBlankLines: true, skipComments: true }],
  },
  overrides: [
    {
      // Test files (and test helpers) run in Node/jsdom via vitest; allow global, process, etc.
      files: ['**/*.test.{js,jsx}', 'src/test/**/*.js', 'src/**/test/**/*.js'],
      env: { node: true },
    },
    {
      // Build/config files run in Node (vite.config.js, postcss.config.js, tailwind.config.js)
      files: ['*.config.js'],
      env: { node: true },
    },
  ],
}
