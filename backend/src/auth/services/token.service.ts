import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import {
  isJwtPayload,
  isSupabaseJwtPayload,
  JwtPayload,
} from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 토큰 생성 및 검증을 담당하는 서비스
 * - JWT 토큰 생성 및 갱신
 * - 리프레시 토큰 관리
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async generateTokens(userId: string, email: string) {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
      }),
    ]);

    // Refresh 토큰 해싱하여 저장 시도 (DB 연결 실패 시 건너뛰기)
    try {
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: hashedRefreshToken },
      });
    } catch (error) {
      this.logger.warn(
        `리프레시 토큰 저장 실패 (DB 연결 문제), 계속 진행: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // DB 연결 실패 시에도 토큰은 발급
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(userId: string, refreshToken: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user?.refreshToken) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      const isTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!isTokenValid) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      const tokens = await this.generateTokens(user.id, user.email);
      return tokens;
    } catch (error) {
      // DB 연결 실패 시 JWT 토큰만으로 갱신
      if (
        error instanceof Error &&
        error.message?.includes("Can't reach database server")
      ) {
        this.logger.warn('DB 연결 실패, JWT 검증만으로 토큰 갱신');

        // JWT 토큰 검증
        try {
          const decoded = this.jwtService.verify(refreshToken) as unknown;
          if (isJwtPayload(decoded)) {
            const tokens = await this.generateTokens(
              decoded.sub,
              decoded.email,
            );
            return tokens;
          } else {
            throw new UnauthorizedException('Invalid token payload');
          }
        } catch (_jwtError) {
          throw new UnauthorizedException('유효하지 않은 토큰입니다.');
        }
      }

      throw error;
    }
  }

  /**
   * JWT 토큰 검증 및 페이로드 반환
   */
  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = (await this.jwtService.verifyAsync(token)) as unknown;
      
      if (isJwtPayload(payload)) {
        return payload;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Token verification failed', error);
      return null;
    }
  }

  /**
   * 토큰 타입을 감지합니다.
   * Supabase 토큰은 특정 클레임(sub, aud, role 등)을 포함합니다.
   */
  detectTokenType(token: string): 'supabase' | 'jwt' | 'unknown' {
    try {
      // JWT 토큰 기본 구조 확인
      const parts = token.split('.');
      if (parts.length !== 3) {
        return 'unknown';
      }

      // 페이로드 디코딩 (검증 없이 단순 디코딩)
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString(),
      ) as unknown;

      // Supabase 토큰 특징 확인
      if (isSupabaseJwtPayload(payload)) {
        return 'supabase';
      }

      // 일반 JWT 토큰 (우리 서버에서 발급)
      if (isJwtPayload(payload)) {
        return 'jwt';
      }

      return 'unknown';
    } catch (error) {
      this.logger.error(
        `Token detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return 'unknown';
    }
  }
}
