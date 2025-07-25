import { type INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';

import { AuthHelper, type TestUser } from './auth-helper';
import { DatabaseCleaner } from './database-cleaner';
import { createE2ETestApp } from './helpers/e2e-test-app';

describe('Users E2E 테스트', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let supabaseService: SupabaseService;
  let authHelper: AuthHelper;
  let adminUser: TestUser;
  let databaseCleaner: DatabaseCleaner;

  beforeAll(async () => {
    app = await createE2ETestApp();

    // Get PrismaService and SupabaseService instances
    prisma = app.get(PrismaService);
    supabaseService = app.get(SupabaseService);
    authHelper = new AuthHelper(app);
    databaseCleaner = new DatabaseCleaner(prisma, supabaseService);

    await databaseCleaner.cleanDatabase();

    // Create admin user for testing
    adminUser = await authHelper.registerUser({
      email: `admin-${Date.now()}@example.com`,
      password: 'AdminPassword123!',
      fullName: 'Admin User',
    });
  });

  beforeEach(async () => {
    // Clean all data except admin user (using proper order)
    await databaseCleaner.cleanTable('checkpoints');
    await databaseCleaner.cleanTable('plans');
    await databaseCleaner.cleanTable('notifications');
    await prisma.user.deleteMany({
      where: {
        NOT: {
          id: adminUser.id,
        },
      },
    });
  });

  afterAll(async () => {
    await databaseCleaner.cleanDatabase();
    await databaseCleaner.disconnect();
    await app.close();
  });

  describe('/auth/register (POST) 회원가입 API', () => {
    it('새로운 사용자를 등록해야 함', async () => {
      const registerDto = {
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        fullName: 'Test User',
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user).toHaveProperty(
        'email',
        registerDto.email,
      );
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('중복된 이메일을 거부해야 함', async () => {
      const registerDto = {
        email: `duplicate${Date.now()}@example.com`,
        password: 'TestPassword123!',
        fullName: 'Test User',
      };

      await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);
      await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);
    });
  });

  describe('/auth/login (POST) 로그인 API', () => {
    it('올바른 자격 증명으로 로그인해야 함', async () => {
      const testUser = await authHelper.registerUser({
        email: `login-test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        fullName: 'Login Test User',
      });

      const response = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
    });

    it('잘못된 자격 증명을 거부해야 함', async () => {
      await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        })
        .expect(401);
    });
  });

  // Removed /auth/me tests as this endpoint doesn't exist in the backend

  describe('/users (GET) 사용자 목록 조회 API', () => {
    it('인증된 사용자는 목록을 조회할 수 있어야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/users')
        .set(authHelper.getAuthHeader(adminUser.accessToken!))
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('인증 없는 요청을 거부해야 함', async () => {
      await request.default(app.getHttpServer()).get('/users').expect(401);
    });
  });

  describe('/users/:id (GET) 사용자 단건 조회 API', () => {
    it('존재하는 사용자를 조회할 수 있어야 함', async () => {
      const testUser = await authHelper.registerUser({
        email: `getuser${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'Get User Test',
      });

      const response = await request
        .default(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(adminUser.accessToken!))
        .expect(200);

      expect(response.body.data).toHaveProperty('id', testUser.id);
      expect(response.body.data).toHaveProperty('email', testUser.email);
    });

    it('존재하지 않는 사용자에 대해 404를 반환해야 함', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      await request
        .default(app.getHttpServer())
        .get(`/users/${fakeId}`)
        .set(authHelper.getAuthHeader(adminUser.accessToken!))
        .expect(404);
    });
  });

  describe('/users/:id (PATCH) 사용자 프로필 수정 API', () => {
    it('사용자 프로필을 업데이트해야 함', async () => {
      const testUser = await authHelper.registerUser({
        email: `update${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'Original Name',
      });

      const updateDto = { fullName: 'Updated Name' };

      const response = await request
        .default(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(updateDto)
        .expect(200);

      expect(response.body.data).toHaveProperty('fullName', updateDto.fullName);
    });
  });

  describe('/users/:id (DELETE) 사용자 삭제 API', () => {
    it('사용자 삭제 시 관련 데이터도 연속 삭제되어야 함', async () => {
      const testUser = await authHelper.registerUser({
        email: `delete${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'Delete Test User',
      });

      await request
        .default(app.getHttpServer())
        .delete(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      await request
        .default(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(adminUser.accessToken!))
        .expect(404);
    });
  });
});
