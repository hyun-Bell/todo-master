import { type INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';

import { AuthHelper, type TestUser } from './auth-helper';
import { DatabaseCleaner } from './database-cleaner';
import { createE2ETestApp } from './helpers/e2e-test-app';

describe('인증 시스템 E2E 테스트', () => {
  let app: INestApplication<App>;
  let authHelper: AuthHelper;
  let prisma: PrismaService;
  let supabaseService: SupabaseService;
  let databaseCleaner: DatabaseCleaner;

  beforeAll(async () => {
    app = await createE2ETestApp();
    authHelper = new AuthHelper(app);
    prisma = app.get<PrismaService>(PrismaService);
    supabaseService = app.get<SupabaseService>(SupabaseService);
    databaseCleaner = new DatabaseCleaner(prisma, supabaseService);

    // Clean database before tests
    await databaseCleaner.cleanDatabase();
  });

  afterAll(async () => {
    await databaseCleaner.cleanDatabase();
    await databaseCleaner.disconnect();
    await app.close();
  });

  describe('회원가입 및 로그인 기본 플로우', () => {
    let testUser: TestUser;

    it('사용자 회원가입이 성공해야 함', async () => {
      const userData = {
        email: `auth-test-${Date.now()}@example.com`,
        password: 'AuthTest123!',
        fullName: 'Auth Test User',
      };

      testUser = await authHelper.registerUser(userData);

      expect(testUser.id).toBeDefined();
      expect(testUser.email).toBe(userData.email);
      expect(testUser.accessToken).toBeDefined();
    });

    it('등록된 사용자로 로그인할 수 있어야 함', async () => {
      const accessToken = await authHelper.loginUser(
        testUser.email,
        testUser.password,
      );

      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
    });

    it('잘못된 비밀번호로 로그인 시 401 에러가 발생해야 함', async () => {
      await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('존재하지 않는 이메일로 로그인 시 401 에러가 발생해야 함', async () => {
      await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });

    it('중복된 이메일로 회원가입 시 409 에러가 발생해야 함', async () => {
      await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUser.email, // 이미 존재하는 이메일
          password: 'AnotherPassword123!',
          fullName: 'Another User',
        })
        .expect(409);
    });
  });

  describe('토큰 갱신 플로우', () => {
    let testUser: TestUser;

    beforeEach(async () => {
      testUser = await authHelper.registerUser({
        email: `token-test-${Date.now()}@example.com`,
        password: 'TokenTest123!',
        fullName: 'Token Test User',
      });
    });

    it('유효한 리프레시 토큰으로 액세스 토큰을 갱신할 수 있어야 함', async () => {
      // 로그인하여 토큰 획득
      const loginResponse = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const { accessToken, refreshToken } = loginResponse.body.data;
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // 토큰 갱신 요청 (인증이 필요하므로 accessToken 사용)
      const refreshResponse = await request
        .default(app.getHttpServer())
        .post('/auth/refresh')
        .set(authHelper.getAuthHeader(accessToken))
        .send({
          refreshToken: refreshToken,
        })
        .expect(200);

      const newTokens = refreshResponse.body.data;
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      
      // 새로운 토큰으로 인증된 요청이 가능한지 확인
      const profileResponse = await request
        .default(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(newTokens.accessToken))
        .expect(200);
      
      expect(profileResponse.body.data).toHaveProperty('id', testUser.id);
    });

    it('유효하지 않은 리프레시 토큰으로 갱신 시 401 에러가 발생해야 함', async () => {
      await request
        .default(app.getHttpServer())
        .post('/auth/refresh')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });

    it('존재하지 않는 사용자 ID로 토큰 갱신 시 401 에러가 발생해야 함', async () => {
      const loginResponse = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const { refreshToken } = loginResponse.body.data;

      await request
        .default(app.getHttpServer())
        .post('/auth/refresh')
        .set(authHelper.getAuthHeader('invalid-token'))  // 유효하지 않은 토큰으로 테스트
        .send({
          refreshToken: refreshToken,
        })
        .expect(401);
    });
  });

  describe('인증이 필요한 엔드포인트 접근', () => {
    let testUser: TestUser;

    beforeEach(async () => {
      testUser = await authHelper.registerUser({
        email: `protected-test-${Date.now()}@example.com`,
        password: 'ProtectedTest123!',
        fullName: 'Protected Test User',
      });
    });

    it('유효한 토큰으로 사용자 프로필에 접근할 수 있어야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      expect(response.body.data).toHaveProperty('id', testUser.id);
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('fullName', testUser.fullName);
    });

    it('토큰 없이 보호된 엔드포인트 접근 시 401 에러가 발생해야 함', async () => {
      await request
        .default(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .expect(401);
    });

    it('유효하지 않은 토큰으로 접근 시 401 에러가 발생해야 함', async () => {
      await request
        .default(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader('invalid-token'))
        .expect(401);
    });

    it('만료된 토큰으로 접근 시 401 에러가 발생해야 함', async () => {
      // JWT 토큰이 즉시 만료되도록 설정된 토큰 생성 (실제로는 백엔드에서 매우 짧은 만료 시간으로 설정해야 함)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWlkIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid';

      await request
        .default(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(expiredToken))
        .expect(401);
    });
  });

  describe('로그아웃 플로우', () => {
    let testUser: TestUser;

    beforeEach(async () => {
      testUser = await authHelper.registerUser({
        email: `logout-test-${Date.now()}@example.com`,
        password: 'LogoutTest123!',
        fullName: 'Logout Test User',
      });
    });

    it('로그아웃 후 리프레시 토큰이 무효화되어야 함', async () => {
      const loginResponse = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const { refreshToken } = loginResponse.body.data;

      // 로그아웃
      await request
        .default(app.getHttpServer())
        .post('/auth/logout')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      // 로그아웃 후 리프레시 토큰으로 갱신 시도하면 실패해야 함
      await request
        .default(app.getHttpServer())
        .post('/auth/refresh')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          refreshToken: refreshToken,
        })
        .expect(401);
    });
  });

  describe('동시 로그인 및 세션 관리', () => {
    let testUser: TestUser;

    beforeEach(async () => {
      testUser = await authHelper.registerUser({
        email: `session-test-${Date.now()}@example.com`,
        password: 'SessionTest123!',
        fullName: 'Session Test User',
      });
    });

    it('동일한 사용자로 여러 번 로그인할 수 있어야 함', async () => {
      // 첫 번째 로그인
      const login1Response = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      // 두 번째 로그인
      const login2Response = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const token1 = login1Response.body.data.accessToken;
      const token2 = login2Response.body.data.accessToken;

      // 두 토큰 모두 유효해야 함
      await request
        .default(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(token1))
        .expect(200);

      await request
        .default(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(token2))
        .expect(200);
    });
  });

  describe('사용자 프로필 관리', () => {
    let testUser: TestUser;

    beforeEach(async () => {
      testUser = await authHelper.registerUser({
        email: `profile-test-${Date.now()}@example.com`,
        password: 'ProfileTest123!',
        fullName: 'Profile Test User',
      });
    });

    it('사용자 프로필을 업데이트할 수 있어야 함', async () => {
      const updateData = {
        fullName: 'Updated Test User',
      };

      const response = await request
        .default(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(updateData)
        .expect(200);

      expect(response.body.data).toHaveProperty('fullName', updateData.fullName);
    });

    it.skip('다른 사용자의 프로필은 수정할 수 없어야 함', async () => {
      // TODO: 사용자 권한 검증 로직이 구현되면 활성화
      // 다른 사용자 생성
      const anotherUser = await authHelper.registerUser({
        email: `another-${Date.now()}@example.com`,
        password: 'AnotherTest123!',
        fullName: 'Another User',
      });

      const updateData = {
        fullName: 'Hacker Name',
      };

      // testUser의 토큰으로 anotherUser 프로필 수정 시도
      await request
        .default(app.getHttpServer())
        .patch(`/users/${anotherUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(updateData)
        .expect(403); // Forbidden
    });
  });
});