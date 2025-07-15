// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.js',
      'generated/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // TypeScript 규칙 - 실용적인 설정
      '@typescript-eslint/no-explicit-any': 'warn', // 경고로 설정하여 점진적 개선 유도
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error', // Promise 처리 필수
      '@typescript-eslint/explicit-function-return-type': 'off', // 타입 추론 활용
      '@typescript-eslint/explicit-module-boundary-types': 'off', // 타입 추론 활용
      '@typescript-eslint/no-inferrable-types': 'error', // 불필요한 타입 선언 제거
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      
      // 안전성 규칙 - 완화된 설정
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      
      // 테스트 파일에서는 규칙 완화
      '@typescript-eslint/unbound-method': [
        'error',
        {
          ignoreStatic: true,
        },
      ],
      
      // 일반 JavaScript 규칙
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'info'],
        },
      ],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'warn',
      'prefer-destructuring': [
        'warn',
        {
          object: true,
          array: false,
        },
      ],
      
      // 코드 품질
      'no-nested-ternary': 'warn',
      'no-unneeded-ternary': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      'no-param-reassign': [
        'warn',
        {
          props: false,
        },
      ],
      
      // 주석 스타일
      'spaced-comment': [
        'warn',
        'always',
        {
          markers: ['/'],
        },
      ],
      
      // import 순서 (prettier와 충돌하지 않음)
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
        },
      ],
    },
  },
  {
    // 테스트 파일에 대한 규칙 완화
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'no-console': 'off',
    },
  },
);