import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { TokenService } from './token.service';
import { LoggerFactory } from '../../common/services/logger';
import { isSupabaseUser, SupabaseUser } from '../../common/types/auth.types';
import type { User } from '@supabase/supabase-js';

/**
 * 인증 관련 비즈니스 로직을 담당하는 서비스
 * - 회원가입, 로그인, 로그아웃 처리
 * - Supabase와의 인증 연동
 */
@Injectable()
export class AuthenticationService {
  private readonly logger = LoggerFactory.create(AuthenticationService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private tokenService: TokenService,
  ) {}

  async register(registerDto: RegisterDto) {
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
      this.logger.warn(`로컬 DB 확인 실패, Supabase로 진행: ${error.message}`);
      // 데이터베이스 연결 실패 시 Supabase로만 진행
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
      let localUser;
      try {
        localUser = await this.syncSupabaseUser(user);
      } catch (error) {
        this.logger.warn(
          `로컬 DB 동기화 실패, Supabase 정보로 진행: ${error.message}`,
        );
        // 로컬 DB 동기화 실패 시 Supabase 정보 사용
        if (isSupabaseUser(user)) {
          localUser = {
            id: user.id,
            email: user.email,
            fullName: user.user_metadata?.fullName || '',
            supabaseId: user.id,
          };
        } else {
          throw new Error('Invalid user data received from Supabase');
        }
      }

      // JWT 토큰 생성
      const tokens = await this.tokenService.generateTokens(
        localUser.id,
        localUser.email,
      );

      return {
        user: {
          id: localUser.id,
          email: localUser.email,
          fullName: localUser.fullName,
          supabaseId: localUser.supabaseId,
        },
        ...tokens,
      };
    } catch (error) {
      this.logger.error(
        'Registration error',
        error instanceof Error ? error.stack : 'Unknown error',
      );
      this.logger.error(
        `Error type: ${error instanceof Error ? error.constructor.name : 'Unknown'}`,
      );
      this.logger.error(
        `Error message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // 더 구체적인 에러 메시지 반환
      const errorMessage =
        error.message || '회원가입 처리 중 오류가 발생했습니다.';
      throw new BadRequestException(errorMessage);
    }
  }

  async login(loginDto: LoginDto) {
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
        user: {
          id: localUser.id,
          email: localUser.email,
          fullName: localUser.fullName,
          supabaseId: localUser.supabaseId,
        },
        ...tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('로그인 처리 중 오류가 발생했습니다.');
    }
  }

  async logout(userId: string) {
    // 로컬 DB에서 refresh token 제거
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    // Supabase 세션도 종료 (옵션)
    try {
      await this.supabaseService.getClient().auth.signOut();
    } catch (error) {
      // Supabase 로그아웃 실패는 무시 (로컬 토큰만 제거해도 충분)
      this.logger.error('Supabase 로그아웃 실패', error);
    }
  }

  async verifySupabaseToken(token: string): Promise<User | null> {
    return this.supabaseService.verifyToken(token);
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        supabaseId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  /**
   * Supabase User를 SupabaseUser 인터페이스로 변환
   */
  private convertSupabaseUser(user: User): SupabaseUser {
    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      created_at: user.created_at,
      updated_at: user.updated_at,
      email_confirmed_at: user.email_confirmed_at,
      phone: user.phone,
      phone_confirmed_at: user.phone_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
    };
  }

  /**
   * Supabase 사용자를 로컬 DB와 동기화
   */
  async syncSupabaseUser(supabaseUser: SupabaseUser | User) {
    // User 타입인 경우 SupabaseUser로 변환
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
            { email: normalizedUser.email },
          ],
        },
      });

      if (user) {
        // 기존 사용자 업데이트
        if (!user.supabaseId) {
          // supabaseId가 없는 기존 사용자에 연결
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
          // 정보 업데이트
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
              normalizedUser.user_metadata?.name,
            avatarUrl:
              (normalizedUser.user_metadata?.avatarUrl as string) ||
              (normalizedUser.user_metadata?.avatar_url as string),
          },
        });
        this.logger.log(`Created new user ${user.email} from Supabase`);
      }

      return user;
    } catch (error) {
      this.logger.error('Error syncing Supabase user', error);
      throw error;
    }
  }

  /**
   * 이메일로 사용자 동기화
   */
  async syncUserByEmail(email: string) {
    try {
      const supabaseUser = await this.supabaseService.getUserByEmail(email);
      if (!supabaseUser) {
        this.logger.warn(`Supabase user not found for email: ${email}`);
        return null;
      }

      return this.syncSupabaseUser(this.convertSupabaseUser(supabaseUser));
    } catch (error) {
      this.logger.error('Error syncing user by email', error);
      throw error;
    }
  }

  /**
   * Supabase ID로 사용자 동기화
   */
  async syncUserBySupabaseId(supabaseId: string) {
    try {
      const supabaseUser = await this.supabaseService.getUserById(supabaseId);
      if (!supabaseUser) {
        this.logger.warn(`Supabase user not found for ID: ${supabaseId}`);
        return null;
      }

      return this.syncSupabaseUser(this.convertSupabaseUser(supabaseUser));
    } catch (error) {
      this.logger.error('Error syncing user by Supabase ID', error);
      throw error;
    }
  }
}
