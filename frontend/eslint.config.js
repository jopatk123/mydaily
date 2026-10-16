import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const MAX_LINES_WARN = 600;
const MAX_LINES_ERROR = 800;

const testGlobals = {
  describe: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  vi: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
};

/** 按「跳过空行与纯注释行」的口径统计有效行数，与内置 `max-lines` 语义一致。 */
function countEffectiveLines(sourceCode) {
  const commentLines = new Set();
  for (const comment of sourceCode.getAllComments()) {
    for (let line = comment.loc.start.line; line <= comment.loc.end.line; line += 1) {
      commentLines.add(line);
    }
  }
  let count = 0;
  sourceCode.getLines().forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.trim() === '' || commentLines.has(lineNumber)) return;
    count += 1;
  });
  return count;
}

/**
 * 内置 `max-lines` 只能配置一个阈值。这里补一条同语义的自定义规则，
 * 让「>600 行警告」与「>800 行报错（阻断 CI）」可以并存。
 */
const fileLengthPlugin = {
  rules: {
    'max-lines-strict': {
      meta: {
        type: 'problem',
        docs: { description: '文件有效行数超过上限时直接报错，避免单文件过大难以维护' },
        schema: [],
        messages: {
          tooLong: '文件有 {{count}} 行有效代码，超过 {{max}} 行上限，请拆分为更小的模块。',
        },
      },
      create(context) {
        return {
          Program(node) {
            const count = countEffectiveLines(context.sourceCode);
            if (count > MAX_LINES_ERROR) {
              context.report({ node, messageId: 'tooLong', data: { count, max: MAX_LINES_ERROR } });
            }
          },
        };
      },
    },
  },
};

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'file-length': fileLengthPlugin,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs['recommended-latest'].rules,
      'react/prop-types': 'off',
      // 查询库和「根据外部数据回填表单」都会触发这两条，误报多于真实问题。
      'react-hooks/incompatible-library': 'off',
      'react-hooks/set-state-in-effect': 'off',
      // 单文件体量：>600 行警告，>800 行报错（阻断 CI），见 AGENTS.md。
      'max-lines': ['warn', { max: MAX_LINES_WARN, skipBlankLines: true, skipComments: true }],
      'file-length/max-lines-strict': 'error',
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'src/test/**/*.{ts,tsx}', 'src/**/test/**/*.{ts,tsx}'],
    languageOptions: { globals: testGlobals },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
);
