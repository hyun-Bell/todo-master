/**
 * 테스트용 인증 어댑터 인터페이스
 * Dual-Mode Testing을 위한 Mock/Real 환경 통합 인터페이스
 */

export interface CreateUserData {
  email: string;
  password: string;
  fullName?: string;
  avatarUrl?: string;
  emailConfirmed?: boolean;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UpdateUserData {
  email?: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  emailConfirmed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  user_metadata?: {
    fullName?: string;
    name?: string;
    avatarUrl?: string;
    [key: string]: unknown;
  };
}

export interface AuthResult {
  user: AuthUser | null;
  session?: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  } | null;
  error?: string | null;
}

/**
 * IAuthAdapter 인터페이스
 * Mock과 Real 환경 모두에서 사용할 수 있는 통합 인증 어댑터
 */
export interface IAuthAdapter {
  /**
   * 새 사용자 생성
   */
  createUser(data: CreateUserData): Promise<AuthResult>;

  /**
   * 사용자 로그인
   */
  signIn(credentials: SignInData): Promise<AuthResult>;

  /**
   * 사용자 로그아웃
   */
  signOut(): Promise<{ error: string | null }>;

  /**
   * 토큰 검증 및 사용자 정보 반환
   */
  verifyToken(token: string): Promise<AuthUser | null>;

  /**
   * ID로 사용자 조회
   */
  getUserById(id: string): Promise<AuthUser | null>;

  /**
   * 이메일로 사용자 조회
   */
  getUserByEmail(email: string): Promise<AuthUser | null>;

  /**
   * 사용자 정보 업데이트
   */
  updateUser(id: string, data: UpdateUserData): Promise<AuthUser | null>;

  /**
   * 사용자 삭제
   */
  deleteUser(id: string): Promise<boolean>;

  /**
   * 어댑터 초기화 (테스트용)
   */
  reset?(): Promise<void>;
}
