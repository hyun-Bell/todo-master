// @ts-check
import tseslint from 'typescript-eslint';

/**
 * TypeScript ESLint 설정
 */
export default {
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname + '/..',
    },
  },
  rules: {
    // ================================
    // TypeScript 기본 규칙 (개발 친화적 완화)
    // ================================
    '@typescript-eslint/no-explicit-any': 'warn', // 초기 개발에서는 경고로
    '@typescript-eslint/no-unused-vars': [
      'warn', // 개발 중에는 경고로
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-floating-promises': 'warn', // 개발 친화적으로 완화
    '@typescript-eslint/require-await': 'warn', // 개발 친화적으로 완화
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-inferrable-types': 'error',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      },
    ],
    
    // ================================
    // 타입 안전성 (개발 단계에서는 경고로 완화)
    // ================================
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/unbound-method': [
      'error',
      {
        ignoreStatic: true,
      },
    ],
    
    // ================================
    // 코드 품질 향상
    // ================================
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn', // 개발 친화적으로 완화
    '@typescript-eslint/no-useless-constructor': 'error',
    
    // ================================
    // 클래스 관련 규칙
    // ================================
    '@typescript-eslint/no-extraneous-class': [
      'error',
      {
        allowEmpty: true, // 데코레이터만 있는 클래스 허용
        allowStaticOnly: true,
        allowWithDecorator: true,
      },
    ],
  },
};