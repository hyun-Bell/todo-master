import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuthenticationService } from '../services/authentication.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import {
  AuthenticatedRequest,
  isJwtPayload,
  isSupabaseUser,
} from '../../common/types/auth.types';

/**
 * JWT와 Supabase 토큰을 모두 지원하는 통합 인증 가드
 * - JWT 토큰 우선 검증
 * - JWT 실패 시 Supabase 토큰 검증
 * - E2E 테스트와 실제 운영 환경 모두 지원
 */
@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  private readonly logger = new Logger(UnifiedAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private supabaseService: SupabaseService,
    private authenticationService: AuthenticationService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Public 데코레이터가 있는 경우 인증 건너뛰기
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
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

    // 1. JWT 토큰 검증 시도 (주로 E2E 테스트용)
    try {
      const payload = (await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      })) as unknown;

      if (isJwtPayload(payload)) {
        // JWT 토큰이 유효한 경우
        request.user = {
          userId: payload.sub,
          email: payload.email,
          fullName: payload.fullName || '',
        };
        request.userId = payload.sub;

        this.logger.debug(`JWT authenticated user: ${payload.email}`);
        return true;
      }
    } catch (_jwtError) {
      // JWT 검증 실패 시 Supabase 토큰 검증으로 이동
      this.logger.debug('JWT verification failed, trying Supabase token');
    }

    // 2. Supabase 토큰 검증 시도
    try {
      const supabaseUser = (await this.supabaseService.verifyToken(
        token,
      )) as unknown;

      if (!supabaseUser || !isSupabaseUser(supabaseUser)) {
        // 테스트 환경에서는 예상된 실패이므로 debug 레벨로 기록
        if (process.env.NODE_ENV === 'test') {
          this.logger.debug('Token verification failed in test environment');
        } else {
          this.logger.warn('Token verification failed');
        }
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      // 로컬 DB와 동기화
      const localUser =
        await this.authenticationService.syncSupabaseUser(supabaseUser);

      // Request에 사용자 정보 추가
      request.supabaseUser = supabaseUser;
      request.user = {
        userId: localUser.id,
        email: localUser.email,
        fullName: localUser.fullName || null,
      };
      request.userId = localUser.id;

      this.logger.debug(`Supabase authenticated user: ${supabaseUser.email}`);
      return true;
    } catch (error) {
      // 테스트 환경에서는 예상된 에러를 debug 레벨로 기록
      if (process.env.NODE_ENV === 'test') {
        this.logger.debug(
          'Authentication failed in test environment',
          error instanceof Error ? error.message : 'Unknown error',
        );
      } else {
        this.logger.error('Authentication error', error);
      }

      // 이미 UnauthorizedException인 경우 그대로 전달
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // 그 외의 경우 일반적인 인증 실패 메시지
      throw new UnauthorizedException('인증에 실패했습니다.');
    }
  }
}
