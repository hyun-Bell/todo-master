// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';

/**
 * ESLint 기본 설정
 */
export default {
  languageOptions: {
    globals: {
      ...globals.node,
      ...globals.jest,
    },
    sourceType: 'commonjs',
  },
  rules: {
    // ================================
    // 기본 JavaScript 규칙
    // ================================
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'prefer-destructuring': [
      'error',
      {
        object: true,
        array: false,
      },
    ],
    
    // 조건문 스타일
    'no-nested-ternary': 'error',
    'no-unneeded-ternary': 'error',
    
    // 함수 스타일
    'arrow-body-style': ['error', 'as-needed'],
    'prefer-arrow-callback': 'error',
    
    // 기타 규칙
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],
    'no-param-reassign': [
      'error',
      {
        props: false,
      },
    ],
    'spaced-comment': [
      'error',
      'always',
      {
        markers: ['/'],
      },
    ],
    'sort-imports': 'off', // TypeScript와 충돌 방지
  },
};