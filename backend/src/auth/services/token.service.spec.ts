import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { JwtPayload } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

import { TokenService } from './token.service';

// bcrypt 모킹
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

type MockPrismaService = {
  user: {
    findUnique: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
  };
};

type MockJwtService = {
  signAsync: jest.MockedFunction<any>;
  verify: jest.MockedFunction<any>;
  verifyAsync: jest.MockedFunction<any>;
};

describe('TokenService 토큰 서비스', () => {
  let service: TokenService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService: MockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService: MockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    fullName: 'Test User',
    supabaseId: 'supabase-123',
    refreshToken: 'hashed-refresh-token',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJwtPayload: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens 토큰 생성', () => {
    const userId = 'user-123';
    const email = 'test@example.com';

    it('성공적으로 액세스 토큰과 리프레시 토큰을 생성해야 함', async () => {
      // Given
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';
      mockJwtService.signAsync
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(refreshToken);
      mockedBcrypt.hash.mockResolvedValue('hashed-refresh-token' as never);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      // When
      const result = await service.generateTokens(userId, email);

      // Then
      expect(result).toEqual({
        accessToken,
        refreshToken,
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        { sub: userId, email },
        { expiresIn: '15m' },
      );
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        { sub: userId, email },
        { expiresIn: '7d' },
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(refreshToken, 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { refreshToken: 'hashed-refresh-token' },
      });
    });

    it('DB 연결 실패 시에도 토큰을 발급해야 함', async () => {
      // Given
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';
      mockJwtService.signAsync
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(refreshToken);
      mockedBcrypt.hash.mockResolvedValue('hashed-refresh-token' as never);
      mockPrismaService.user.update.mockRejectedValue(
        new Error("Can't reach database server"),
      );

      // When
      const result = await service.generateTokens(userId, email);

      // Then
      expect(result).toEqual({
        accessToken,
        refreshToken,
      });
    });

    it('bcrypt 해싱 실패 시에도 토큰을 발급해야 함', async () => {
      // Given
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';
      mockJwtService.signAsync
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(refreshToken);
      mockedBcrypt.hash.mockRejectedValue(new Error('Hashing failed') as never);

      // When
      const result = await service.generateTokens(userId, email);

      // Then
      expect(result).toEqual({
        accessToken,
        refreshToken,
      });
    });
  });

  describe('refreshToken 토큰 갱신', () => {
    const userId = 'user-123';
    const refreshToken = 'refresh-token';

    it('성공적으로 토큰을 갱신해야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockedBcrypt.hash.mockResolvedValue('new-hashed-refresh-token' as never);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      // When
      const result = await service.refreshToken(userId, refreshToken);

      // Then
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        refreshToken,
        mockUser.refreshToken,
      );
    });

    it('사용자를 찾을 수 없는 경우 UnauthorizedException을 던져야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // When & Then
      await expect(service.refreshToken(userId, refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('리프레시 토큰이 없는 경우 UnauthorizedException을 던져야 함', async () => {
      // Given
      const userWithoutToken = { ...mockUser, refreshToken: null };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithoutToken);

      // When & Then
      await expect(service.refreshToken(userId, refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('리프레시 토큰이 유효하지 않은 경우 UnauthorizedException을 던져야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // When & Then
      await expect(service.refreshToken(userId, refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('DB 연결 실패 시 JWT 토큰으로 갱신해야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error("Can't reach database server"),
      );
      mockJwtService.verify.mockReturnValue(mockJwtPayload);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockedBcrypt.hash.mockResolvedValue('new-hashed-refresh-token' as never);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      // When
      const result = await service.refreshToken(userId, refreshToken);

      // Then
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken);
    });

    it('DB 연결 실패 시 JWT 토큰도 유효하지 않으면 UnauthorizedException을 던져야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error("Can't reach database server"),
      );
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // When & Then
      await expect(service.refreshToken(userId, refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('DB 연결 실패 시 JWT 페이로드가 유효하지 않으면 UnauthorizedException을 던져야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error("Can't reach database server"),
      );
      mockJwtService.verify.mockReturnValue({ invalid: 'payload' });

      // When & Then
      await expect(service.refreshToken(userId, refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyToken 토큰 검증', () => {
    const token = 'jwt-token';

    it('유효한 토큰의 페이로드를 반환해야 함', async () => {
      // Given
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

      // When
      const result = await service.verifyToken(token);

      // Then
      expect(result).toEqual(mockJwtPayload);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(token);
    });

    it('유효하지 않은 페이로드인 경우 null을 반환해야 함', async () => {
      // Given
      mockJwtService.verifyAsync.mockResolvedValue({ invalid: 'payload' });

      // When
      const result = await service.verifyToken(token);

      // Then
      expect(result).toBeNull();
    });

    it('토큰 검증 실패 시 null을 반환해야 함', async () => {
      // Given
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // When
      const result = await service.verifyToken(token);

      // Then
      expect(result).toBeNull();
    });
  });

  describe('detectTokenType 토큰 타입 감지', () => {
    it('Supabase 토큰을 올바르게 감지해야 함', () => {
      // Given
      const supabasePayload = {
        sub: 'user-123',
        aud: 'authenticated',
        role: 'authenticated',
        session_id: 'session-123',
      };
      const supabaseToken = `header.${Buffer.from(JSON.stringify(supabasePayload)).toString('base64')}.signature`;

      // When
      const result = service.detectTokenType(supabaseToken);

      // Then
      expect(result).toBe('supabase');
    });

    it('JWT 토큰을 올바르게 감지해야 함', () => {
      // Given
      const jwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };
      const jwtToken = `header.${Buffer.from(JSON.stringify(jwtPayload)).toString('base64')}.signature`;

      // When
      const result = service.detectTokenType(jwtToken);

      // Then
      expect(result).toBe('jwt');
    });

    it('알 수 없는 토큰 형식인 경우 unknown을 반환해야 함', () => {
      // Given
      const invalidToken = 'invalid-token';

      // When
      const result = service.detectTokenType(invalidToken);

      // Then
      expect(result).toBe('unknown');
    });

    it('3개의 파트가 없는 토큰인 경우 unknown을 반환해야 함', () => {
      // Given
      const invalidToken = 'header.payload';

      // When
      const result = service.detectTokenType(invalidToken);

      // Then
      expect(result).toBe('unknown');
    });

    it('페이로드 디코딩 실패 시 unknown을 반환해야 함', () => {
      // Given
      const invalidToken = 'header.invalid-base64.signature';

      // When
      const result = service.detectTokenType(invalidToken);

      // Then
      expect(result).toBe('unknown');
    });

    it('알 수 없는 페이로드 구조인 경우 unknown을 반환해야 함', () => {
      // Given
      const unknownPayload = {
        unknown: 'structure',
      };
      const unknownToken = `header.${Buffer.from(JSON.stringify(unknownPayload)).toString('base64')}.signature`;

      // When
      const result = service.detectTokenType(unknownToken);

      // Then
      expect(result).toBe('unknown');
    });
  });
});