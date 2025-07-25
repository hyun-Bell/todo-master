/**
 * JWT 인증 제공자
 * 테스트 및 로컬 개발 환경에서 사용되는 JWT 기반 인증 구현체
 * Supabase 없이 순수 JWT + Prisma로 동작
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { LoggerFactory } from '../../common/services/logger';
import { PrismaService } from '../../prisma/prisma.service';
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
export class JwtAuthProvider implements IAuthProvider {
  private readonly logger = LoggerFactory.create(JwtAuthProvider.name);
  readonly providerType = 'jwt' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    this.logger.log(`JWT 회원가입 시작: ${registerDto.email}`);

    try {
      // 이메일 중복 체크
      const existingUser = await this.prisma.user.findUnique({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
      }

      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      // 사용자 생성
      const newUser = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          fullName: registerDto.fullName,
          supabaseId: null, // JWT Provider는 Supabase ID 없음
        },
      });

      this.logger.log(`JWT 사용자 생성 성공: ${newUser.email}`);

      const authUser = this.convertPrismaUserToAuthUser(newUser);

      // JWT 토큰 생성
      const tokens = await this.tokenService.generateTokens(
        authUser.id,
        authUser.email,
      );

      return {
        user: authUser,
        tokens,
      };
    } catch (error) {
      this.logger.error('JWT Registration error', error);

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
      // 사용자 조회
      const user = await this.prisma.user.findUnique({
        where: { email: loginDto.email },
      });

      if (!user || !user.password) {
        throw new UnauthorizedException(
          '이메일 또는 비밀번호가 올바르지 않습니다.',
        );
      }

      // 비밀번호 검증
      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException(
          '이메일 또는 비밀번호가 올바르지 않습니다.',
        );
      }

      this.logger.log(`JWT 로그인 성공: ${user.email}`);

      const authUser = this.convertPrismaUserToAuthUser(user);

      // JWT 토큰 생성
      const tokens = await this.tokenService.generateTokens(
        authUser.id,
        authUser.email,
      );

      return {
        user: authUser,
        tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('JWT Login error', error);
      throw new UnauthorizedException('로그인 처리 중 오류가 발생했습니다.');
    }
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      // JWT 토큰 검증 및 페이로드 추출
      const payload = await this.tokenService.verifyToken(token);
      if (!payload) {
        return null;
      }

      // 사용자 조회
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        return null;
      }

      return this.convertPrismaUserToAuthUser(user);
    } catch (error) {
      this.logger.error('JWT Token verification error', error);
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResult> {
    try {
      // TokenService의 refreshToken 메서드 활용
      return this.tokenService.refreshToken('', refreshToken);
    } catch (error) {
      this.logger.error('JWT Refresh token error', error);
      throw new UnauthorizedException('토큰 갱신에 실패했습니다.');
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      // 로컬 DB에서 refresh token 제거
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });

      this.logger.log(`JWT 로그아웃 완료: ${userId}`);
    } catch (error) {
      this.logger.warn(`JWT 로그아웃 실패: ${getErrorMessage(error)}`);
      // 로그아웃 실패는 심각한 오류가 아니므로 에러를 던지지 않음
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
      this.logger.error('JWT Get user by ID error', error);
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
      this.logger.error('JWT Get user by email error', error);
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
      this.logger.error('JWT Update user error', error);
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });

      this.logger.log(`JWT 사용자 삭제 완료: ${id}`);
      return true;
    } catch (error) {
      this.logger.error('JWT Delete user error', error);
      return false;
    }
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
      emailConfirmed: true, // JWT Provider에서는 이메일 확인 과정 없음
      supabaseId: user.supabaseId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

}