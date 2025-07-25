/**
 * 인증 제공자 인터페이스
 * Strategy Pattern 구현을 위한 핵심 인터페이스
 * 
 * 모든 인증 제공자(Supabase, JWT, OAuth 등)는 이 인터페이스를 구현해야 함
 */

import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

/**
 * 인증된 사용자 정보 (표준화된 형태)
 */
export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  emailConfirmed?: boolean;
  supabaseId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  user_metadata?: {
    fullName?: string;
    name?: string;
    avatarUrl?: string;
    [key: string]: unknown;
  };
}

/**
 * 토큰 정보
 */
export interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

/**
 * 인증 결과
 */
export interface AuthResult {
  user: AuthUser;
  tokens: TokenResult;
}

/**
 * 사용자 업데이트 정보
 */
export interface UpdateUserData {
  email?: string;
  fullName?: string;
  avatarUrl?: string;
}

/**
 * 인증 제공자 인터페이스
 * 
 * 모든 인증 제공자는 이 인터페이스를 구현하여 일관된 인증 API 제공
 */
export interface IAuthProvider {
  /**
   * 사용자 회원가입
   */
  register(data: RegisterDto): Promise<AuthResult>;

  /**
   * 사용자 로그인
   */
  login(data: LoginDto): Promise<AuthResult>;

  /**
   * 토큰 검증 및 사용자 정보 반환
   */
  verifyToken(token: string): Promise<AuthUser | null>;

  /**
   * 토큰 갱신
   */
  refreshToken(refreshToken: string): Promise<TokenResult>;

  /**
   * 사용자 로그아웃
   */
  logout(userId: string): Promise<void>;

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
   * 사용자 삭제 (테스트 환경용)
   */
  deleteUser(id: string): Promise<boolean>;

  /**
   * Provider 타입 식별자
   */
  readonly providerType: 'supabase' | 'jwt' | 'oauth';
}