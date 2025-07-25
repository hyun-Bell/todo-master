/**
 * Strategic Auth Guard
 * Strategy Pattern을 적용한 통합 인증 가드
 * 
 * 환경에 따라 적절한 AuthProvider를 주입받아 사용
 * - 테스트/개발: JwtAuthProvider
 * - 운영: SupabaseAuthProvider
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticatedRequest } from '../../common/types/auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IAuthProvider, AuthUser } from '../interfaces/auth-provider.interface';

@Injectable()
export class StrategicAuthGuard implements CanActivate {
  private readonly logger = new Logger(StrategicAuthGuard.name);

  constructor(
    @Inject('AUTH_PROVIDER') private readonly authProvider: IAuthProvider,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Public route 확인
    if (this.isPublicRoute(context)) {
      this.logger.debug('Public route accessed');
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    this.logger.debug(`Authenticating request to: ${request.method} ${request.url}`);
    
    const token = this.extractTokenFromRequest(request);

    try {
      // AuthProvider를 통한 토큰 검증
      this.logger.debug(`Using auth provider: ${this.authProvider.providerType}`);
      const user = await this.authProvider.verifyToken(token);
      
      if (!user) {
        this.logAuthenticationFailure('Token verification failed');
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      // Request에 사용자 정보 첨부
      this.attachUserToRequest(request, user);
      
      this.logger.debug(
        `Authentication successful - Provider: ${this.authProvider.providerType}, User: ${user.email}, URL: ${request.url}`,
      );

      return true;
    } catch (error) {
      this.logger.error(`Authentication failed for URL: ${request.url}`, error);
      this.handleAuthenticationError(error);
      throw error; // 이미 처리된 에러를 다시 throw
    }
  }

  /**
   * Public route 여부 확인
   */
  private isPublicRoute(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ?? false;
  }

  /**
   * Request에서 Bearer 토큰 추출
   */
  private extractTokenFromRequest(request: AuthenticatedRequest): string {
    const authHeader = request.headers?.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      this.logger.warn('No authorization header found');
      throw new UnauthorizedException('인증 토큰이 없습니다.');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      this.logger.warn('No bearer token found');
      throw new UnauthorizedException('유효하지 않은 토큰 형식입니다.');
    }

    return token;
  }

  /**
   * Request에 사용자 정보 첨부
   */
  private attachUserToRequest(
    request: AuthenticatedRequest,
    user: AuthUser,
  ): void {
    request.user = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName ?? null,
    };
    request.userId = user.id;

    // Supabase 사용자인 경우 추가 정보 첨부
    if (user.supabaseId) {
      request.supabaseUser = {
        id: user.supabaseId,
        email: user.email,
        user_metadata: user.user_metadata,
      };
    }
  }

  /**
   * 인증 실패 로그 기록
   */
  private logAuthenticationFailure(reason: string): void {
    if (process.env.NODE_ENV === 'test') {
      this.logger.debug(`Authentication failed in test environment: ${reason}`);
    } else {
      this.logger.warn(`Authentication failed: ${reason}`);
    }
  }

  /**
   * 인증 에러 처리
   */
  private handleAuthenticationError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (process.env.NODE_ENV === 'test') {
      this.logger.debug(
        `Authentication error in test environment: ${errorMessage}`,
      );
    } else {
      this.logger.error('Authentication error', error);
    }

    // UnauthorizedException은 그대로 전달
    if (error instanceof UnauthorizedException) {
      return;
    }

    // 기타 에러는 UnauthorizedException으로 변환
    throw new UnauthorizedException('인증에 실패했습니다.');
  }
}