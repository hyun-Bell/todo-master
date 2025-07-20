# Todo Master Frontend - 프로젝트 가이드

## 프로젝트 개요

Todo Master는 React Native + Expo 기반의 목표 관리 애플리케이션입니다. TypeScript로 개발되었으며, Zustand를 사용한 상태 관리와 JWT 기반 인증을 구현하고 있습니다.

### 기술 스택
- **Framework**: React Native + Expo SDK 53
- **Language**: TypeScript 5.8
- **상태 관리**: Zustand 5.0 (with persist middleware)
- **Form 관리**: React Hook Form 7.60
- **Navigation**: React Navigation 7
- **백엔드 통신**: Axios (HTTP), Supabase JS (인증/DB)
- **스타일링**: React Native StyleSheet
- **패키지 매니저**: pnpm

### 주요 의존성
```json
{
  "expo": "~53.0.17",
  "react": "19.0.0",
  "react-native": "0.79.5",
  "zustand": "^5.0.6",
  "@supabase/supabase-js": "^2.51.0",
  "react-hook-form": "^7.60.0",
  "@react-navigation/native": "^7.1.14"
}
```

## 프로젝트 구조

```
frontend/
├── src/
│   ├── components/       # 재사용 가능한 UI 컴포넌트
│   │   ├── common/      # 공통 컴포넌트 (Button, Input 등)
│   │   └── README.md
│   ├── screens/         # 화면 컴포넌트
│   │   ├── auth/       # 인증 관련 화면
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── Home.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/       # API 통신 서비스
│   │   └── api.service.ts
│   ├── store/          # Zustand 상태 관리
│   │   └── authStore.ts
│   ├── hooks/          # 커스텀 훅
│   ├── utils/          # 유틸리티 함수
│   │   ├── config.ts
│   │   └── logger.ts
│   ├── types/          # TypeScript 타입 정의
│   │   ├── database.ts
│   │   └── env.d.ts
│   ├── constants/      # 상수 정의
│   │   └── config.ts
│   ├── navigation/     # 네비게이션 설정
│   └── assets/        # 정적 자산
├── App.tsx            # 앱 진입점
├── package.json       # 프로젝트 설정
├── tsconfig.json      # TypeScript 설정
├── babel.config.js    # Babel 설정 (경로 별칭)
└── .env.example      # 환경 변수 템플릿
```

## 환경 설정

### 필수 환경 변수 (.env)
```bash
# Supabase 설정
EXPO_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]

# 백엔드 API URL
EXPO_PUBLIC_API_URL=http://localhost:3000

# 환경
EXPO_PUBLIC_ENV=development
```

### 경로 별칭 (Path Aliases)
프로젝트에서는 다음과 같은 경로 별칭을 사용합니다:
- `@/` → `src/`
- `@components/` → `src/components/`
- `@screens/` → `src/screens/`
- `@services/` → `src/services/`
- `@types/` → `src/types/`
- `@utils/` → `src/utils/`
- `@hooks/` → `src/hooks/`
- `@store/` → `src/store/`
- `@constants/` → `src/constants/`

## 개발 가이드라인

### 스크립트 명령어
```bash
# 개발 서버 실행
pnpm start

# 플랫폼별 실행
pnpm ios       # iOS 시뮬레이터
pnpm android   # Android 에뮬레이터
pnpm web       # 웹 브라우저

# 코드 품질 검사
pnpm lint      # ESLint 검사
pnpm lint:fix  # ESLint 자동 수정
pnpm format    # Prettier 포맷팅
pnpm typecheck # TypeScript 타입 검사
```

### 인증 플로우
1. **JWT 토큰 기반 인증**
   - Access Token: Bearer 토큰으로 API 요청시 사용
   - Refresh Token: 토큰 갱신을 위해 사용
   - AsyncStorage에 토큰 저장

2. **Zustand AuthStore 구조**
   ```typescript
   interface AuthState {
     user: User | null;
     isAuthenticated: boolean;
     isLoading: boolean;
     error: string | null;
     
     // Actions
     login: (email: string, password: string) => Promise<void>;
     register: (email: string, password: string, fullName: string) => Promise<void>;
     logout: () => Promise<void>;
     refreshSession: () => Promise<void>;
     checkAuthStatus: () => Promise<void>;
   }
   ```

3. **API 서비스 패턴**
   - 모든 API 요청은 `api.service.ts`를 통해 처리
   - 자동 토큰 주입 및 에러 처리
   - TypeScript 타입 안전성 보장

### 상태 관리 전략
- **Zustand**: 전역 상태 관리 (인증, 사용자 정보)
- **React Hook Form**: 폼 상태 관리
- **AsyncStorage**: 영구 저장소 (토큰, 사용자 설정)

## 1. 네이밍 컨벤션

### 컴포넌트
- 파일명: **PascalCase** (예: `Button.tsx`, `HomeScreen.tsx`)
- 컴포넌트 함수명: **PascalCase** (예: `Button`, `HomeScreen`)
- 기본 export 사용: `export default Button`

### 함수 및 변수
- 함수명: **camelCase** (예: `handlePress`, `validateInput`)
- 변수명: **camelCase** (예: `buttonStyle`, `userInfo`)
- 상수명: **camelCase** (예: `defaultConfig`, `apiEndpoint`)

### 타입 및 인터페이스
- 인터페이스명: **PascalCase** (예: `ButtonProps`, `UserData`)
- 타입 별칭: **PascalCase** (예: `LogLevel`, `NavigationParams`)
- Props 인터페이스: `ComponentNameProps` (예: `ButtonProps`)

## 2. 파일 구조

### 디렉토리 구조
```
frontend/src/
├── components/
│   ├── common/           # 재사용 가능한 공통 컴포넌트
│   ├── forms/           # 폼 관련 컴포넌트
│   └── ui/              # UI 전용 컴포넌트
├── screens/             # 화면 컴포넌트
├── hooks/               # 커스텀 훅
├── services/            # API 서비스
├── store/               # 상태 관리 (Zustand)
├── lib/                 # 외부 라이브러리 설정
├── utils/               # 유틸리티 함수
├── types/               # 타입 정의
├── constants/           # 상수
├── navigation/          # 네비게이션 설정
└── assets/              # 정적 자산
```

### 파일 네이밍 규칙
- 컴포넌트 파일: `ComponentName.tsx`
- 유틸리티 파일: `utilityName.ts`
- 타입 파일: `typeName.ts`
- 서비스 파일: `serviceName.ts`

## 3. Import/Export 패턴

### 절대 경로 사용
```typescript
// ✅ 좋은 예
import Button from '@components/common/Button';
import { logger } from '@utils/logger';
import type { Database } from '@types/database';

// ❌ 나쁜 예
import Button from '../../../components/common/Button';
```

### Import 순서
1. **외부 라이브러리** (React, React Native, 서드파티)
2. **내부 모듈** (components, utils, services 등)
3. **타입 import** (`type` 키워드 사용)

```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { logger } from '@utils/logger';
import Button from '@components/common/Button';

import type { ButtonProps } from '@types/components';
```

### Export 패턴
- **기본 export**: 컴포넌트, 스크린
- **Named export**: 유틸리티, 타입, 상수

## 4. 컴포넌트 구조

### 함수형 컴포넌트 패턴
```typescript
interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onPress: () => void;
}

const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onPress,
  style,
  ...props
}) => {
  const buttonStyle = [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

export default Button;
```

### 컴포넌트 구조 순서
1. **Interface 정의**
2. **컴포넌트 함수**
3. **StyleSheet 정의**
4. **Export**

## 5. 타입 정의

### Interface vs Type
- **Interface**: Props, 확장 가능한 객체 타입
- **Type**: Union 타입, 유틸리티 타입

```typescript
// ✅ Interface 사용
interface UserProps {
  name: string;
  email: string;
}

// ✅ Type 사용
type Status = 'pending' | 'completed' | 'failed';
type User = Database['public']['Tables']['users']['Row'];
```

### 제네릭 활용
```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

const fetchUser = async (): Promise<ApiResponse<User>> => {
  // API 호출
};
```

## 6. 스타일링

### StyleSheet 사용
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primary: {
    backgroundColor: '#007AFF',
  },
  disabled: {
    opacity: 0.6,
  },
});
```

### 동적 스타일 패턴
```typescript
// 배열을 통한 스타일 조합
const buttonStyle = [
  styles.button,
  variant === 'primary' && styles.primary,
  disabled && styles.disabled,
  style, // 외부에서 전달받은 스타일
];
```

## 7. 상태 관리

### React Hooks 패턴
```typescript
const HomeScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<User[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await userService.getUsers();
      setData(result);
    } catch (error) {
      logger.error('데이터 로드 실패', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    // JSX
  );
};
```

### 커스텀 훅 패턴
```typescript
const useUserData = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    // 로직 구현
    setLoading(false);
  };

  return { users, loading, fetchUsers };
};
```

## 8. 에러 처리

### Try-Catch 패턴
```typescript
const handleSubmit = async () => {
  try {
    await userService.createUser(userData);
    // 성공 처리
  } catch (error) {
    logger.error('사용자 생성 실패', error);
    // 에러 처리
  }
};
```

### 타입 안전한 에러 처리
```typescript
interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

const isApiError = (error: unknown): error is ApiError => {
  return typeof error === 'object' && error !== null && 'message' in error;
};
```

## 9. 주석과 문서화

### 주석 스타일
```typescript
// 한국어 주석 사용
// 사용자 인증 상태 확인
const checkAuthStatus = () => {
  // 토큰 유효성 검사
  if (token && !isTokenExpired(token)) {
    return true;
  }
  return false;
};
```

### JSDoc 스타일 (필요시)
```typescript
/**
 * 사용자 데이터를 가져오는 함수
 * @param userId - 사용자 ID
 * @returns 사용자 정보 Promise
 */
const fetchUser = async (userId: string): Promise<User> => {
  // 구현
};
```

## 10. 환경 설정

### 환경 변수 사용
```typescript
// utils/config.ts
export const getConfig = () => ({
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
});

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
```

## 11. 테스트 컨벤션

### 테스트 파일 구조
```
components/
├── Button.tsx
├── Button.test.tsx
└── __tests__/
    └── Button.test.tsx
```

### 테스트 코드 패턴
```typescript
describe('Button 컴포넌트', () => {
  it('타이틀이 올바르게 렌더링되어야 한다', () => {
    // 테스트 구현
  });

  it('onPress 핸들러가 호출되어야 한다', () => {
    // 테스트 구현
  });
});
```

## 12. 성능 최적화

### React.memo 사용
```typescript
const Button = React.memo<ButtonProps>(({ title, onPress }) => {
  // 컴포넌트 구현
});
```

### useCallback 사용
```typescript
const handlePress = useCallback(() => {
  // 핸들러 로직
}, [dependency]);
```

## 13. 접근성 (Accessibility)

### 접근성 속성 추가
```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="사용자 프로필 버튼"
  accessibilityHint="사용자 프로필 화면으로 이동합니다"
  accessibilityRole="button"
>
  <Text>프로필</Text>
</TouchableOpacity>
```

## 14. 네비게이션 패턴

### 타입 안전한 네비게이션
```typescript
type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Settings: undefined;
};

const navigation = useNavigation<NavigationProp<RootStackParamList>>();

// 타입 안전한 네비게이션
navigation.navigate('Profile', { userId: '123' });
```

## 15. 프로젝트별 특이사항

### 백엔드 통합
- **백엔드 URL**: `http://localhost:3000/api/v1`
- **인증 방식**: JWT Bearer Token
- **토큰 저장**: AsyncStorage 사용
- **토큰 갱신**: 14분마다 자동 갱신 (TOKEN_REFRESH_INTERVAL)

### API 응답 형식
```typescript
interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}
```

### 에러 처리 패턴
- 모든 API 에러는 `api.service.ts`에서 중앙 처리
- 네트워크 에러와 서버 에러 구분
- 한국어 에러 메시지 표시

### 개발 시 주의사항
1. **환경 변수**: 모든 환경 변수는 `EXPO_PUBLIC_` 접두사 필수
2. **상태 영속성**: Zustand persist는 사용자 정보와 인증 상태만 저장
3. **토큰 관리**: Access Token과 Refresh Token 별도 관리
4. **타입 안전성**: 모든 API 호출과 네비게이션은 타입 정의 필수

### 디버깅 도구
- **Logger**: `@utils/logger`로 통합 로깅
- **환경별 로그 레벨**: development에서만 debug 레벨 활성화

### 향후 구현 예정 기능
- Goal (목표) CRUD 기능
- Task (할일) 관리 기능
- 알림 기능
- 다크 모드 지원
- 다국어 지원 (i18n)