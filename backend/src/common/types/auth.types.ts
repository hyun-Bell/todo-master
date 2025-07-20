/**
 * 인증 관련 공통 타입 정의
 * Supabase, JWT 및 인증 시스템 전반에 사용되는 타입들
 */

import { type Request } from 'express';

/**
 * Supabase 사용자 타입
 */
export interface SupabaseUser {
  id: string;
  email?: string; // Supabase User 타입과 호환성을 위해 optional로 변경
  user_metadata?: {
    fullName?: string;
    name?: string;
    avatarUrl?: string;
    [key: string]: unknown;
  };
  app_metadata?: {
    [key: string]: unknown;
  };
  created_at?: string;
  updated_at?: string;
  email_confirmed_at?: string;
  phone?: string;
  phone_confirmed_at?: string;
  last_sign_in_at?: string;
}

/**
 * JWT 페이로드 타입
 */
export interface JwtPayload {
  sub: string; // 사용자 ID
  email: string; // 이메일
  fullName?: string; // 전체 이름
  iat?: number; // 토큰 발급 시간
  exp?: number; // 토큰 만료 시간
  [key: string]: unknown;
}

/**
 * Supabase JWT 페이로드 타입
 */
export interface SupabaseJwtPayload {
  aud: string; // audience
  role: string; // 사용자 역할
  sub: string; // 사용자 ID
  email?: string; // 이메일
  iat?: number; // 토큰 발급 시간
  exp?: number; // 토큰 만료 시간
  [key: string]: unknown;
}

/**
 * 확장된 Request 인터페이스
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    fullName?: string | null;
  };
  supabaseUser?: SupabaseUser;
  userId?: string;
}

/**
 * API 에러 응답 타입
 */
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  timestamp?: string;
  path?: string;
}

/**
 * 성공 응답 타입
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp?: string;
}

/**
 * 토큰 응답 타입
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * 사용자 인증 결과 타입
 */
export interface AuthResult {
  user: {
    id: string;
    email: string;
    fullName?: string;
  };
  tokens: TokenResponse;
}

/**
 * 타입 가드 함수들
 */
export function isSupabaseUser(user: unknown): user is SupabaseUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof (user as SupabaseUser).id === 'string' &&
    ((user as SupabaseUser).email === undefined ||
      typeof (user as SupabaseUser).email === 'string')
  );
}

export function isJwtPayload(payload: unknown): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as JwtPayload).sub === 'string' &&
    typeof (payload as JwtPayload).email === 'string'
  );
}

export function isSupabaseJwtPayload(
  payload: unknown,
): payload is SupabaseJwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as SupabaseJwtPayload).sub === 'string' &&
    typeof (payload as SupabaseJwtPayload).aud === 'string' &&
    typeof (payload as SupabaseJwtPayload).role === 'string'
  );
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as ApiError).message === 'string' &&
    typeof (error as ApiError).statusCode === 'number'
  );
}
