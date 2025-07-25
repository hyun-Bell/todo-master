// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import promisePlugin from 'eslint-plugin-promise';
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
  promisePlugin.configs['flat/recommended'],
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
      // ================================
      // TypeScript 기본 규칙
      // ================================
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-await': 'warn', // async 함수에 await 필수 (완화)
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
      // NestJS 특화 규칙
      // ================================
      
      // 의존성 주입 패턴 (생성자 매개변수 프로퍼티 사용 권장)
      '@typescript-eslint/parameter-properties': [
        'warn', // error에서 warn으로 완화
        {
          allow: ['readonly', 'private', 'private readonly'],
          prefer: 'parameter-property',
        },
      ],
      
      // 데코레이터 사용 시 클래스 규칙
      '@typescript-eslint/no-extraneous-class': [
        'error',
        {
          allowEmpty: true, // 데코레이터만 있는 클래스 허용
          allowStaticOnly: true,
          allowWithDecorator: true,
        },
      ],
      
      // Injectable 클래스는 반드시 주입 가능해야 함
      '@typescript-eslint/prefer-readonly': 'error',
      
      // ================================
      // 네이밍 컨벤션 (NestJS 스타일) - 완화된 설정
      // ================================
      '@typescript-eslint/naming-convention': [
        'warn', // error에서 warn으로 완화
        // 기본 camelCase
        {
          selector: 'default',
          format: ['camelCase'],
        },
        // 클래스는 PascalCase
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        // 인터페이스는 I 접두사 + PascalCase (선택적)
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        // 타입은 PascalCase
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        // enum은 PascalCase
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        // enum 멤버는 UPPER_CASE
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        // 상수는 UPPER_CASE 또는 camelCase
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['UPPER_CASE', 'camelCase', 'PascalCase'],
        },
        // 메서드는 camelCase
        {
          selector: 'method',
          format: ['camelCase'],
        },
        // 객체 프로퍼티는 유연하게 (환경변수 등 허용)
        {
          selector: 'objectLiteralProperty',
          format: null, // 제한 없음
        },
        // 일반 프로퍼티는 camelCase (private은 _ 접두사 허용)
        {
          selector: 'property',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allowSingleOrDouble',
        },
        // 매개변수는 camelCase
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
      ],
      
      // ================================
      // 코드 품질 및 복잡도 제한 (완화된 설정)
      // ================================
      'complexity': ['warn', 15], // 함수 복잡도 제한 (완화)
      'max-lines-per-function': ['warn', { max: 80 }], // 함수당 최대 줄 수 (완화)
      'max-params': ['warn', 5], // 매개변수 개수 제한 (완화)
      'max-lines': ['warn', 500], // 파일당 최대 줄 수 (완화)
      'max-depth': ['warn', 5], // 중첩 깊이 제한 (완화)
      
      // 클래스 관련
      'max-classes-per-file': ['warn', 3], // 파일당 클래스 수 (완화)
      '@typescript-eslint/no-useless-constructor': 'error',
      
      // ================================
      // 일관된 코딩 스타일
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
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', // error에서 warn으로 완화
      
      // 함수 스타일
      'arrow-body-style': ['error', 'as-needed'],
      'prefer-arrow-callback': 'error',
      
      // ================================
      // Import/Export 규칙 (간소화)
      // ================================
      // import 관련 규칙 비활성화 (resolver 이슈로 인해)
      // 'import/order': 'off',
      // 'import/no-duplicates': 'off',
      // 'import/no-unused-modules': 'off',
      // 'import/prefer-default-export': 'off',
      
      // ================================
      // Promise 관련 규칙 (완화된 설정)
      // ================================
      'promise/catch-or-return': 'warn',
      'promise/no-nesting': 'warn',
      'promise/prefer-await-to-then': 'warn',
      'promise/prefer-await-to-callbacks': 'warn',
      
      // ================================
      // 안전성 규칙 (완화된 설정)
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
      // 기타 규칙
      // ================================
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
      
      // 기본 sort-imports 비활성화 (import/order와 충돌 방지)
      'sort-imports': 'off',
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
      'max-lines-per-function': 'off', // 테스트는 길어질 수 있음
      'max-lines': 'off',
      'complexity': 'off',
      '@typescript-eslint/naming-convention': 'off', // 테스트용 변수명 유연성
      'import/no-unused-modules': 'off', // 테스트 헬퍼 함수들
    },
  },
);