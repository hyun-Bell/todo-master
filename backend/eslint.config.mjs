// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

// 모듈화된 설정 파일들 import
import baseConfig from './eslint/base.js';
import typescriptConfig from './eslint/typescript.js';
import nestjsConfig from './eslint/nestjs.js';
import promiseConfig from './eslint/promise.js';
import testingConfig from './eslint/testing.js';

export default tseslint.config(
  // ================================
  // 무시할 파일들
  // ================================
  {
    ignores: [
      'eslint.config.mjs',
      'eslint/**/*.js', // eslint 설정 파일들
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.js',
      'generated/**',
    ],
  },
  
  // ================================
  // 기본 설정들
  // ================================
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  
  // ================================
  // 커스텀 모듈화된 설정들
  // ================================
  baseConfig,
  typescriptConfig,
  nestjsConfig,
  promiseConfig,
  
  // ================================
  // 테스트 환경 설정
  // ================================
  testingConfig,
);