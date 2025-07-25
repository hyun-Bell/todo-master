import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SupabaseService } from '../../supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticationService } from '../services/authentication.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
    private readonly authenticationService: AuthenticationService,
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

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('No authorization header found');
      throw new UnauthorizedException('인증 토큰이 없습니다.');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      this.logger.warn('No bearer token found');
      throw new UnauthorizedException('유효하지 않은 토큰 형식입니다.');
    }

    try {
      // Supabase 토큰 검증
      const supabaseUser = await this.supabaseService.verifyToken(token);

      if (!supabaseUser) {
        // 테스트 환경에서는 예상된 실패이므로 warn 레벨로 기록
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
        fullName: localUser.fullName,
      };
      request.userId = localUser.id;

      this.logger.log(`Authenticated user: ${supabaseUser.email}`);
      return true;
    } catch (error) {
      // 테스트 환경에서는 예상된 에러를 debug 레벨로 기록
      if (process.env.NODE_ENV === 'test') {
        this.logger.debug(
          'Authentication failed in test environment',
          error.message,
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
