/**
 * Supabase 인증 제공자
 * 실제 운영 환경에서 사용되는 Supabase 기반 인증 구현체
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';

import { LoggerFactory } from '../../common/services/logger';
import { isSupabaseUser, SupabaseUser } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import {
  AuthResult,
  AuthUser,
  IAuthProvider,
  TokenResult,
  UpdateUserData,
} from '../interfaces/auth-provider.interface';
import { TokenService } from '../services/token.service';

/**
 * Error 객체에서 안전하게 메시지를 추출하는 헬퍼 함수
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

@Injectable()
export class SupabaseAuthProvider implements IAuthProvider {
  private readonly logger = LoggerFactory.create(SupabaseAuthProvider.name);
  readonly providerType = 'supabase' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly tokenService: TokenService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    this.logger.log(`회원가입 시작: ${registerDto.email}`);

    // 이메일 중복 체크 (로컬 DB) - 데이터베이스 연결 실패 시 건너뛰기
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.warn(
        `로컬 DB 확인 실패, Supabase로 진행: ${getErrorMessage(error)}`,
      );
    }

    try {
      this.logger.log('Supabase 사용자 생성 요청...');
      // Supabase SDK로 사용자 생성
      const { data: authData, error } = await this.supabaseService
        .getAdminClient()
        .auth.admin.createUser({
          email: registerDto.email,
          password: registerDto.password,
          email_confirm: true,
          user_metadata: {
            fullName: registerDto.fullName,
          },
        });

      if (error) {
        this.logger.error('Supabase 사용자 생성 실패', error.message);
        if (error.message?.includes('already registered')) {
          throw new ConflictException('이미 사용 중인 이메일입니다.');
        }
        throw new BadRequestException('사용자 생성에 실패했습니다.');
      }

      this.logger.log('Supabase 사용자 생성 성공');
      const { user } = authData;

      // 로컬 DB에 사용자 동기화 시도
      let localUser: AuthUser;
      try {
        localUser = await this.syncSupabaseUser(user);
      } catch (error) {
        this.logger.warn(
          `로컬 DB 동기화 실패, Supabase 정보로 진행: ${getErrorMessage(error)}`,
        );
        // 로컬 DB 동기화 실패 시 Supabase 정보 사용
        if (isSupabaseUser(user)) {
          localUser = this.convertSupabaseUserToAuthUser(user);
        } else {
          throw new Error('Invalid user data received from Supabase');
        }
      }

      // JWT 토큰 생성
      if (!localUser.email) {
        throw new BadRequestException('사용자 이메일 정보가 없습니다.');
      }

      const tokens = await this.tokenService.generateTokens(
        localUser.id,
        localUser.email,
      );

      return {
        user: localUser,
        tokens,
      };
    } catch (error) {
      this.logger.error(
        'Registration error',
        error instanceof Error ? error.stack : 'Unknown error',
      );

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : '회원가입 처리 중 오류가 발생했습니다.';
      throw new BadRequestException(errorMessage);
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    try {
      // Supabase SDK로 로그인 시도
      const { data: authData, error } = await this.supabaseService
        .getClient()
        .auth.signInWithPassword({
          email: loginDto.email,
          password: loginDto.password,
        });

      if (error || !authData?.user) {
        this.logger.error(
          'Supabase 로그인 실패',
          error?.message || '알 수 없는 오류',
        );
        throw new UnauthorizedException(
          '이메일 또는 비밀번호가 올바르지 않습니다.',
        );
      }

      // 로컬 DB에 사용자 동기화
      const localUser = await this.syncSupabaseUser(authData.user);

      // JWT 토큰 생성
      const tokens = await this.tokenService.generateTokens(
        localUser.id,
        localUser.email,
      );

      return {
        user: localUser,
        tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('로그인 처리 중 오류가 발생했습니다.');
    }
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const supabaseUser = await this.supabaseService.verifyToken(token);
      if (!supabaseUser || !isSupabaseUser(supabaseUser)) {
        return null;
      }

      // 로컬 DB와 동기화
      return this.syncSupabaseUser(supabaseUser);
    } catch (error) {
      this.logger.error('Token verification error', error);
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResult> {
    try {
      // Supabase 토큰 갱신 로직은 추후 구현
      // 현재는 TokenService의 기능 활용
      return this.tokenService.refreshToken('', refreshToken);
    } catch (error) {
      throw new UnauthorizedException('토큰 갱신에 실패했습니다.');
    }
  }

  async logout(userId: string): Promise<void> {
    // 로컬 DB에서 refresh token 제거
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
    } catch (error) {
      this.logger.warn(`로컬 DB 로그아웃 실패: ${getErrorMessage(error)}`);
    }

    // Supabase 세션도 종료
    try {
      await this.supabaseService.getClient().auth.signOut();
    } catch (error) {
      this.logger.error('Supabase 로그아웃 실패', error);
    }
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return null;
      }

      return this.convertPrismaUserToAuthUser(user);
    } catch (error) {
      this.logger.error('Get user by ID error', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return null;
      }

      return this.convertPrismaUserToAuthUser(user);
    } catch (error) {
      this.logger.error('Get user by email error', error);
      return null;
    }
  }

  async updateUser(id: string, data: UpdateUserData): Promise<AuthUser | null> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          email: data.email,
          fullName: data.fullName,
          avatarUrl: data.avatarUrl,
        },
      });

      return this.convertPrismaUserToAuthUser(updatedUser);
    } catch (error) {
      this.logger.error('Update user error', error);
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      // 로컬 DB에서 사용자 삭제
      await this.prisma.user.delete({
        where: { id },
      });

      // Supabase에서도 사용자 삭제 (테스트 환경용)
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: { supabaseId: true },
      });

      if (user?.supabaseId) {
        await this.supabaseService.deleteUser(user.supabaseId);
      }

      return true;
    } catch (error) {
      this.logger.error('Delete user error', error);
      return false;
    }
  }

  /**
   * Supabase User를 SupabaseUser 인터페이스로 변환
   */
  private convertSupabaseUser(user: User): SupabaseUser {
    return {
      id: user.id,
      email: user.email ?? undefined,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      created_at: user.created_at ?? undefined,
      updated_at: user.updated_at ?? undefined,
      email_confirmed_at: user.email_confirmed_at ?? undefined,
      phone: user.phone ?? undefined,
      phone_confirmed_at: user.phone_confirmed_at ?? undefined,
      last_sign_in_at: user.last_sign_in_at ?? undefined,
    };
  }

  /**
   * Supabase 사용자를 AuthUser로 변환
   */
  private convertSupabaseUserToAuthUser(user: SupabaseUser | User): AuthUser {
    const normalizedUser =
      'email' in user && typeof user.email === 'undefined'
        ? this.convertSupabaseUser(user as User)
        : (user as SupabaseUser);

    return {
      id: normalizedUser.id,
      email: normalizedUser.email || '',
      fullName:
        normalizedUser.user_metadata?.fullName ||
        normalizedUser.user_metadata?.name ||
        '',
      avatarUrl:
        (normalizedUser.user_metadata?.avatarUrl as string) ||
        (normalizedUser.user_metadata?.avatar_url as string),
      emailConfirmed: !!normalizedUser.email_confirmed_at,
      supabaseId: normalizedUser.id,
      user_metadata: normalizedUser.user_metadata,
    };
  }

  /**
   * Prisma User를 AuthUser로 변환
   */
  private convertPrismaUserToAuthUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      emailConfirmed: true, // 로컬 DB의 사용자는 이미 확인된 것으로 간주
      supabaseId: user.supabaseId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Supabase 사용자를 로컬 DB와 동기화
   */
  private async syncSupabaseUser(
    supabaseUser: SupabaseUser | User,
  ): Promise<AuthUser> {
    const normalizedUser =
      'email' in supabaseUser && typeof supabaseUser.email === 'undefined'
        ? this.convertSupabaseUser(supabaseUser as User)
        : (supabaseUser as SupabaseUser);

    try {
      // 기존 사용자 확인 (supabaseId 또는 email로)
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { supabaseId: normalizedUser.id },
            ...(normalizedUser.email ? [{ email: normalizedUser.email }] : []),
          ],
        },
      });

      if (user) {
        // 기존 사용자 업데이트
        if (!user.supabaseId) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              supabaseId: normalizedUser.id,
              fullName:
                normalizedUser.user_metadata?.fullName ||
                normalizedUser.user_metadata?.name ||
                user.fullName,
              avatarUrl:
                normalizedUser.user_metadata?.avatarUrl ||
                normalizedUser.user_metadata?.avatar_url ||
                user.avatarUrl,
            },
          });
          this.logger.log(
            `Connected existing user ${user.email} with Supabase ID ${normalizedUser.id}`,
          );
        } else {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              fullName:
                normalizedUser.user_metadata?.fullName ||
                normalizedUser.user_metadata?.name ||
                user.fullName,
              avatarUrl:
                normalizedUser.user_metadata?.avatarUrl ||
                normalizedUser.user_metadata?.avatar_url ||
                user.avatarUrl,
            },
          });
          this.logger.log(`Updated user ${user.email} from Supabase`);
        }
      } else {
        // 새 사용자 생성
        user = await this.prisma.user.create({
          data: {
            email: normalizedUser.email || '',
            supabaseId: normalizedUser.id,
            fullName:
              normalizedUser.user_metadata?.fullName ||
              normalizedUser.user_metadata?.name ||
              null,
            avatarUrl:
              (normalizedUser.user_metadata?.avatarUrl as string) ||
              (normalizedUser.user_metadata?.avatar_url as string),
          },
        });
        this.logger.log(`Created new user ${user.email} from Supabase`);
      }

      return this.convertPrismaUserToAuthUser(user);
    } catch (error) {
      this.logger.error('Error syncing Supabase user', error);
      throw error;
    }
  }
}