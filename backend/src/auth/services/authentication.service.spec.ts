import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

import { AuthenticationService } from './authentication.service';
import { TokenService } from './token.service';

type MockPrismaService = {
  user: {
    findUnique: jest.MockedFunction<any>;
    findFirst: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
  };
};

type MockSupabaseService = {
  getAdminClient: jest.MockedFunction<() => any>;
  getClient: jest.MockedFunction<() => any>;
  verifyToken: jest.MockedFunction<(token: string) => Promise<any>>;
  getUserByEmail: jest.MockedFunction<(email: string) => Promise<any>>;
  getUserById: jest.MockedFunction<(id: string) => Promise<any>>;
};

type MockTokenService = {
  generateTokens: jest.MockedFunction<
    (userId: string, email: string) => Promise<any>
  >;
};

describe('AuthenticationService 인증 서비스', () => {
  let service: AuthenticationService;
  let prismaService: PrismaService;
  let supabaseService: SupabaseService;
  let tokenService: TokenService;

  const mockPrismaService: MockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockSupabaseService: MockSupabaseService = {
    getAdminClient: jest.fn(),
    getClient: jest.fn(),
    verifyToken: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserById: jest.fn(),
  };

  const mockTokenService: MockTokenService = {
    generateTokens: jest.fn(),
  };

  const mockSupabaseAuth = {
    admin: {
      createUser: jest.fn(),
    },
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    fullName: 'Test User',
    supabaseId: 'supabase-123',
    refreshToken: null,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSupabaseUser = {
    id: 'supabase-123',
    email: 'test@example.com',
    user_metadata: {
      fullName: 'Test User',
    },
    app_metadata: {},
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    prismaService = module.get<PrismaService>(PrismaService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
    tokenService = module.get<TokenService>(TokenService);

    // Supabase client mock 설정
    mockSupabaseService.getAdminClient.mockReturnValue({
      auth: mockSupabaseAuth,
    });
    mockSupabaseService.getClient.mockReturnValue({
      auth: mockSupabaseAuth,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register 회원가입', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    };

    it('성공적으로 회원가입을 처리해야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(null); // 중복 없음
      mockSupabaseAuth.admin.createUser.mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      // When
      const result = await service.register(registerDto);

      // Then
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: mockUser.fullName,
          supabaseId: mockUser.supabaseId,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockSupabaseAuth.admin.createUser).toHaveBeenCalledWith({
        email: registerDto.email,
        password: registerDto.password,
        email_confirm: true,
        user_metadata: {
          fullName: registerDto.fullName,
        },
      });
    });

    it('로컬 DB에 이미 존재하는 이메일인 경우 ConflictException을 던져야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // When & Then
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockSupabaseAuth.admin.createUser).not.toHaveBeenCalled();
    });

    it('Supabase 사용자 생성 실패 시 BadRequestException을 던져야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockSupabaseAuth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: 'User creation failed' },
      });

      // When & Then
      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Supabase에서 이미 등록된 이메일 오류 시 ConflictException을 던져야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockSupabaseAuth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' },
      });

      // When & Then
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('로컬 DB 연결 실패 시에도 Supabase 사용자 생성을 시도해야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error("Can't reach database server"),
      );
      mockSupabaseAuth.admin.createUser.mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      // When
      const result = await service.register(registerDto);

      // Then
      expect(result).toBeDefined();
      expect(mockSupabaseAuth.admin.createUser).toHaveBeenCalled();
    });

    it('사용자 이메일이 없는 경우 BadRequestException을 던져야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockSupabaseAuth.admin.createUser.mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });
      const userWithoutEmail = { ...mockUser, email: null };
      mockPrismaService.user.create.mockResolvedValue(userWithoutEmail);

      // When & Then
      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login 로그인', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('성공적으로 로그인을 처리해야 함', async () => {
      // Given
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });
      // syncSupabaseUser가 호출되도록 설정
      mockPrismaService.user.findFirst.mockResolvedValue(null); // 새 사용자로 가정
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      // When
      const result = await service.login(loginDto);

      // Then
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: mockUser.fullName,
          supabaseId: mockUser.supabaseId,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: loginDto.email,
        password: loginDto.password,
      });
    });

    it('Supabase 로그인 실패 시 UnauthorizedException을 던져야 함', async () => {
      // Given
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      // When & Then
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('사용자 데이터가 없는 경우 UnauthorizedException을 던져야 함', async () => {
      // Given
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // When & Then
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('예외 발생 시 UnauthorizedException을 던져야 함', async () => {
      // Given
      mockSupabaseAuth.signInWithPassword.mockRejectedValue(
        new Error('Network error'),
      );

      // When & Then
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout 로그아웃', () => {
    const userId = 'user-123';

    it('성공적으로 로그아웃을 처리해야 함', async () => {
      // Given
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

      // When
      await service.logout(userId);

      // Then
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { refreshToken: null },
      });
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });

    it('Supabase 로그아웃 실패 시에도 로컬 토큰은 제거되어야 함', async () => {
      // Given
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockSupabaseAuth.signOut.mockRejectedValue(new Error('Supabase error'));

      // When
      await service.logout(userId);

      // Then
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { refreshToken: null },
      });
    });
  });

  describe('verifySupabaseToken Supabase 토큰 검증', () => {
    const token = 'supabase-token';

    it('Supabase 토큰을 성공적으로 검증해야 함', async () => {
      // Given
      const expectedUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabaseService.verifyToken.mockResolvedValue(expectedUser);

      // When
      const result = await service.verifySupabaseToken(token);

      // Then
      expect(result).toEqual(expectedUser);
      expect(mockSupabaseService.verifyToken).toHaveBeenCalledWith(token);
    });

    it('토큰 검증 실패 시 null을 반환해야 함', async () => {
      // Given
      mockSupabaseService.verifyToken.mockResolvedValue(null);

      // When
      const result = await service.verifySupabaseToken(token);

      // Then
      expect(result).toBeNull();
    });
  });

  describe('getUserProfile 사용자 프로필 조회', () => {
    const userId = 'user-123';

    it('사용자 프로필을 성공적으로 조회해야 함', async () => {
      // Given
      const expectedProfile = {
        id: mockUser.id,
        email: mockUser.email,
        fullName: mockUser.fullName,
        supabaseId: mockUser.supabaseId,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(expectedProfile);

      // When
      const result = await service.getUserProfile(userId);

      // Then
      expect(result).toEqual(expectedProfile);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
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
    });

    it('사용자를 찾을 수 없는 경우 UnauthorizedException을 던져야 함', async () => {
      // Given
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // When & Then
      await expect(service.getUserProfile(userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('syncSupabaseUser Supabase 사용자 동기화', () => {
    it('새 사용자를 성공적으로 생성해야 함', async () => {
      // Given
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      // When
      const result = await service.syncSupabaseUser(mockSupabaseUser);

      // Then
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: mockSupabaseUser.email,
          supabaseId: mockSupabaseUser.id,
          fullName: mockSupabaseUser.user_metadata.fullName,
          avatarUrl: undefined,
        },
      });
    });

    it('기존 사용자를 성공적으로 업데이트해야 함', async () => {
      // Given
      const existingUser = { ...mockUser, supabaseId: null };
      mockPrismaService.user.findFirst.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...existingUser,
        supabaseId: mockSupabaseUser.id,
      });

      // When
      const result = await service.syncSupabaseUser(mockSupabaseUser);

      // Then
      expect(result.supabaseId).toBe(mockSupabaseUser.id);
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('동기화 실패 시 에러를 던져야 함', async () => {
      // Given
      mockPrismaService.user.findFirst.mockRejectedValue(
        new Error('Database error'),
      );

      // When & Then
      await expect(service.syncSupabaseUser(mockSupabaseUser)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('syncUserByEmail 이메일로 사용자 동기화', () => {
    const email = 'test@example.com';

    it('이메일로 사용자를 성공적으로 동기화해야 함', async () => {
      // Given
      mockSupabaseService.getUserByEmail.mockResolvedValue(mockSupabaseUser);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      // When
      const result = await service.syncUserByEmail(email);

      // Then
      expect(result).toEqual(mockUser);
      expect(mockSupabaseService.getUserByEmail).toHaveBeenCalledWith(email);
    });

    it('Supabase에서 사용자를 찾을 수 없는 경우 null을 반환해야 함', async () => {
      // Given
      mockSupabaseService.getUserByEmail.mockResolvedValue(null);

      // When
      const result = await service.syncUserByEmail(email);

      // Then
      expect(result).toBeNull();
    });

    it('동기화 실패 시 에러를 던져야 함', async () => {
      // Given
      mockSupabaseService.getUserByEmail.mockRejectedValue(
        new Error('Supabase error'),
      );

      // When & Then
      await expect(service.syncUserByEmail(email)).rejects.toThrow(
        'Supabase error',
      );
    });
  });

  describe('syncUserBySupabaseId Supabase ID로 사용자 동기화', () => {
    const supabaseId = 'supabase-123';

    it('Supabase ID로 사용자를 성공적으로 동기화해야 함', async () => {
      // Given
      mockSupabaseService.getUserById.mockResolvedValue(mockSupabaseUser);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      // When
      const result = await service.syncUserBySupabaseId(supabaseId);

      // Then
      expect(result).toEqual(mockUser);
      expect(mockSupabaseService.getUserById).toHaveBeenCalledWith(supabaseId);
    });

    it('Supabase에서 사용자를 찾을 수 없는 경우 null을 반환해야 함', async () => {
      // Given
      mockSupabaseService.getUserById.mockResolvedValue(null);

      // When
      const result = await service.syncUserBySupabaseId(supabaseId);

      // Then
      expect(result).toBeNull();
    });

    it('동기화 실패 시 에러를 던져야 함', async () => {
      // Given
      mockSupabaseService.getUserById.mockRejectedValue(
        new Error('Supabase error'),
      );

      // When & Then
      await expect(service.syncUserBySupabaseId(supabaseId)).rejects.toThrow(
        'Supabase error',
      );
    });
  });
});