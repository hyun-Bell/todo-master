import { Test, type TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthenticationService } from './services/authentication.service';
import { TokenService } from './services/token.service';
import { type RegisterDto } from './dto/register.dto';
import { type LoginDto } from './dto/login.dto';

type MockAuthenticationService = {
  register: jest.MockedFunction<(dto: RegisterDto) => Promise<any>>;
  login: jest.MockedFunction<(dto: LoginDto) => Promise<any>>;
  logout: jest.MockedFunction<(userId: string) => Promise<void>>;
  verifySupabaseToken: jest.MockedFunction<(token: string) => Promise<any>>;
  getUserProfile: jest.MockedFunction<(userId: string) => Promise<any>>;
};

type MockTokenService = {
  generateTokens: jest.MockedFunction<(userId: string) => Promise<any>>;
  refreshToken: jest.MockedFunction<
    (userId: string, refreshToken: string) => Promise<any>
  >;
  detectTokenType: jest.MockedFunction<(token: string) => string>;
};

describe('AuthService 인증 서비스', () => {
  let service: AuthService;
  let _authenticationService: AuthenticationService;
  let _tokenService: TokenService;

  const mockAuthenticationService: MockAuthenticationService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    verifySupabaseToken: jest.fn(),
    getUserProfile: jest.fn(),
  };

  const mockTokenService: MockTokenService = {
    generateTokens: jest.fn(),
    refreshToken: jest.fn(),
    detectTokenType: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthenticationService,
          useValue: mockAuthenticationService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _authenticationService = module.get<AuthenticationService>(
      AuthenticationService,
    );
    _tokenService = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register 회원가입', () => {
    it('회원가입 시 AuthenticationService.register를 호출해야 함', async () => {
      // Given
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };
      const expectedResult = {
        user: {
          id: 'user-id',
          email: registerDto.email,
          fullName: registerDto.fullName,
          supabaseId: 'supabase-id',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      mockAuthenticationService.register.mockResolvedValue(expectedResult);

      // When
      const result = await service.register(registerDto);

      // Then
      expect(result).toEqual(expectedResult);
      expect(mockAuthenticationService.register).toHaveBeenCalledWith(
        registerDto,
      );
    });
  });

  describe('login 로그인', () => {
    it('로그인 시 AuthenticationService.login을 호출해야 함', async () => {
      // Given
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedResult = {
        user: {
          id: 'user-id',
          email: loginDto.email,
          fullName: 'Test User',
          supabaseId: 'supabase-id',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      mockAuthenticationService.login.mockResolvedValue(expectedResult);

      // When
      const result = await service.login(loginDto);

      // Then
      expect(result).toEqual(expectedResult);
      expect(mockAuthenticationService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refreshToken 토큰 갱신', () => {
    it('토큰 갱신 시 TokenService.refreshToken을 호출해야 함', async () => {
      // Given
      const userId = 'user-id';
      const refreshToken = 'refresh-token';
      const expectedResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockTokenService.refreshToken.mockResolvedValue(expectedResult);

      // When
      const result = await service.refreshToken(userId, refreshToken);

      // Then
      expect(result).toEqual(expectedResult);
      expect(mockTokenService.refreshToken).toHaveBeenCalledWith(
        userId,
        refreshToken,
      );
    });
  });

  describe('logout 로그아웃', () => {
    it('로그아웃 시 AuthenticationService.logout을 호출해야 함', async () => {
      // Given
      const userId = 'user-id';

      // When
      await service.logout(userId);

      // Then
      expect(mockAuthenticationService.logout).toHaveBeenCalledWith(userId);
    });
  });

  describe('verifySupabaseToken Supabase 토큰 검증', () => {
    it('Supabase 토큰 검증 시 AuthenticationService.verifySupabaseToken을 호출해야 함', async () => {
      // Given
      const token = 'supabase-token';
      const expectedUser = {
        id: 'user-id',
        email: 'test@example.com',
      };
      mockAuthenticationService.verifySupabaseToken.mockResolvedValue(
        expectedUser,
      );

      // When
      const result = await service.verifySupabaseToken(token);

      // Then
      expect(result).toEqual(expectedUser);
      expect(
        mockAuthenticationService.verifySupabaseToken,
      ).toHaveBeenCalledWith(token);
    });
  });

  describe('getUserProfile 사용자 프로필 조회', () => {
    it('사용자 프로필 조회 시 AuthenticationService.getUserProfile을 호출해야 함', async () => {
      // Given
      const userId = 'user-id';
      const expectedProfile = {
        id: userId,
        email: 'test@example.com',
        fullName: 'Test User',
        supabaseId: 'supabase-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAuthenticationService.getUserProfile.mockResolvedValue(
        expectedProfile,
      );

      // When
      const result = await service.getUserProfile(userId);

      // Then
      expect(result).toEqual(expectedProfile);
      expect(mockAuthenticationService.getUserProfile).toHaveBeenCalledWith(
        userId,
      );
    });
  });
});
