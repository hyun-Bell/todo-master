/**
 * AuthService Mock
 *
 * IAuthAdapter를 사용하여 AuthService의 동작을 모킹
 */

import { type IAuthAdapter } from '../adapters/auth-adapter.interface';

export const createAuthServiceMock = (adapter: IAuthAdapter) => ({
  register: jest.fn(async (registerDto) => {
    const result = await adapter.createUser({
      email: registerDto.email,
      password: registerDto.password,
      fullName: registerDto.fullName,
    });

    if (result.error || !result.user) {
      throw new Error(result.error || 'User creation failed');
    }

    // AuthService.register() 응답 형식 - TransformInterceptor가 감쌀 data 부분만 반환
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.user_metadata?.fullName || registerDto.fullName,
        supabaseId: result.user.id,
      },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };
  }),

  login: jest.fn(async (loginDto) => {
    const result = await adapter.signIn(loginDto);

    if (result.error || !result.user) {
      throw new Error(result.error || 'Login failed');
    }

    // AuthService.login() 응답 형식 - TransformInterceptor가 감쌀 data 부분만 반환
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.user_metadata?.fullName,
        supabaseId: result.user.id,
      },
      accessToken: result.session?.access_token || 'mock-access-token',
      refreshToken: result.session?.refresh_token || 'mock-refresh-token',
    };
  }),

  logout: jest.fn(async (userId) => {
    await adapter.signOut();
    return { message: '로그아웃되었습니다.' };
  }),

  refreshToken: jest.fn(async (userId, refreshToken) => ({
    accessToken: 'new-mock-access-token',
    refreshToken: 'new-mock-refresh-token',
  })),

  getUserProfile: jest.fn(async (userId) => {
    const user = await adapter.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.fullName,
      supabaseId: user.id,
    };
  }),

  validateUser: jest.fn(async (email, password) => {
    const result = await adapter.signIn({ email, password });
    return result.user;
  }),

  generateTokens: jest.fn(async (userId, email) => ({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  })),
});
