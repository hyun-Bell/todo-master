// @ts-check

/**
 * 테스트 환경용 ESLint 설정
 */
export default {
  files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
  rules: {
    // ================================
    // 테스트 파일에서 완화된 규칙
    // ================================
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
    'max-params': 'off', // 테스트 헬퍼 함수들
    
    // ================================
    // 테스트 특화 규칙 유지
    // ================================
    '@typescript-eslint/no-floating-promises': 'error', // 테스트에서도 중요
    '@typescript-eslint/require-await': 'error', // 테스트에서도 중요
  },
};