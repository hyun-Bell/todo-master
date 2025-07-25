import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { AuthenticatedRequest } from '../../common/types/auth.types';
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
    if (this.isPublicRoute(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    return this.authenticateUser(request, token);
  }

  private isPublicRoute(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ?? false;
  }

  private extractToken(request: Request): string {
    const authHeader = request.headers.authorization;

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

  private async authenticateUser(
    request: AuthenticatedRequest,
    token: string,
  ): Promise<boolean> {
    try {
      const supabaseUser = await this.supabaseService.verifyToken(token);

      if (!supabaseUser) {
        this.logTokenVerificationFailure();
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      await this.attachUserToRequest(request, supabaseUser);

      this.logger.log(`Authenticated user: ${supabaseUser.email}`);
      return true;
    } catch (error) {
      this.handleAuthenticationError(error);
      throw error; // 이미 처리된 에러를 다시 throw
    }
  }

  private logTokenVerificationFailure(): void {
    if (process.env.NODE_ENV === 'test') {
      this.logger.debug('Token verification failed in test environment');
    } else {
      this.logger.warn('Token verification failed');
    }
  }

  private async attachUserToRequest(
    request: AuthenticatedRequest,
    supabaseUser: any, // TODO: Supabase User 타입 정의 필요
  ): Promise<void> {
    const localUser =
      await this.authenticationService.syncSupabaseUser(supabaseUser);

    request.supabaseUser = supabaseUser;
    request.user = {
      userId: localUser.id,
      email: localUser.email,
      fullName: localUser.fullName,
    };
    request.userId = localUser.id;
  }

  private handleAuthenticationError(error: unknown): void {
    if (process.env.NODE_ENV === 'test') {
      this.logger.debug(
        'Authentication failed in test environment',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } else {
      this.logger.error('Authentication error', error);
    }

    if (error instanceof UnauthorizedException) {
      return; // UnauthorizedException은 그대로 전달
    }

    throw new UnauthorizedException('인증에 실패했습니다.');
  }
}
