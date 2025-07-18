# Frontend 코드 컨벤션

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