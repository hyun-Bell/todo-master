import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import {
  type AuthenticatedRequest,
  isSupabaseUser,
} from '../../common/types/auth.types';

export interface CurrentUser {
  userId: string;
  email: string;
  fullName?: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    // Supabase 사용자 처리
    if (request.supabaseUser && isSupabaseUser(request.supabaseUser)) {
      return {
        userId: request.supabaseUser.id,
        email: request.supabaseUser.email || '',
        fullName:
          request.supabaseUser.user_metadata?.fullName ||
          request.supabaseUser.user_metadata?.name,
      };
    }

    // 기존 JWT 사용자 처리
    if (request.user) {
      return request.user;
    }

    throw new Error('No authenticated user found in request');
  },
);
