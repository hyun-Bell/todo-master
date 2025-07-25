import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../services/token.service';
import { JwtAuthProvider } from './jwt-auth.provider';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { mockPrismaService } from '../../../test/utils/mock-prisma';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('JwtAuthProvider', () => {
  let provider: JwtAuthProvider;
  let tokenService: jest.Mocked<TokenService>;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    password: 'hashed-password',
    fullName: 'Test User',
    avatarUrl: null,
    supabaseId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockTokenService = {
      generateTokens: jest.fn(),
      verifyToken: jest.fn(),
      refreshToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthProvider,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    provider = module.get<JwtAuthProvider>(JwtAuthProvider);
    tokenService = module.get(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    };

    it('새 사용자를 성공적으로 등록해야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      tokenService.generateTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      // When
      const result = await provider.register(registerDto);

      // Then
      expect(result.user.email).toBe(registerDto.email);
      expect(result.tokens.accessToken).toBe('access-token');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          password: 'hashed-password',
          fullName: registerDto.fullName,
          supabaseId: null,
        },
      });
    });

    it('이메일 중복 시 ConflictException을 던져야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // When & Then
      await expect(provider.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('올바른 자격증명으로 로그인해야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      tokenService.generateTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      // When
      const result = await provider.login(loginDto);

      // Then
      expect(result.user.email).toBe(loginDto.email);
      expect(result.tokens.accessToken).toBe('access-token');
    });

    it('잘못된 비밀번호 시 UnauthorizedException을 던져야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // When & Then
      await expect(provider.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('존재하지 않는 사용자 시 UnauthorizedException을 던져야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // When & Then
      await expect(provider.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyToken', () => {
    it('유효한 토큰을 검증해야 함', async () => {
      // Given
      const token = 'valid-token';
      const payload = { sub: 'user-id', email: 'test@example.com' };
      tokenService.verifyToken.mockResolvedValue(payload);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // When
      const result = await provider.verifyToken(token);

      // Then
      expect(result?.id).toBe(mockUser.id);
      expect(result?.email).toBe(mockUser.email);
    });

    it('유효하지 않은 토큰에 대해 null을 반환해야 함', async () => {
      // Given
      const token = 'invalid-token';
      tokenService.verifyToken.mockResolvedValue(null);

      // When
      const result = await provider.verifyToken(token);

      // Then
      expect(result).toBeNull();
    });
  });

  describe('providerType', () => {
    it('jwt 타입을 반환해야 함', () => {
      expect(provider.providerType).toBe('jwt');
    });
  });
});