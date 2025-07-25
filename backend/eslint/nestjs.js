// @ts-check

/**
 * NestJS 특화 ESLint 설정
 */
export default {
  rules: {
    // ================================
    // NestJS 의존성 주입 패턴
    // ================================
    '@typescript-eslint/parameter-properties': [
      'warn', // 개발 친화적으로 완화
      {
        allow: ['readonly', 'private', 'private readonly'],
        prefer: 'parameter-property',
      },
    ],
    
    // ================================
    // 네이밍 컨벤션 (NestJS 스타일)
    // ================================
    '@typescript-eslint/naming-convention': [
      'error', // warn → error
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
      // 인터페이스는 PascalCase (I 접두사 선택적)
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
    // 코드 품질 및 복잡도 제한 (개발 친화적 완화)
    // ================================
    'complexity': ['warn', 15], // NestJS 비즈니스 로직 고려
    'max-lines-per-function': ['warn', { max: 100 }], // 설정/초기화 함수 고려
    'max-params': ['warn', 6], // NestJS DI 패턴 고려
    'max-lines': ['warn', 500], // 완화
    'max-depth': ['warn', 5], // 완화
    
    // 클래스 관련
    'max-classes-per-file': ['warn', 3], // 테스트 파일 고려
  },
};