import { type INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';
import { GoalStatus, Priority } from '../src/../generated/prisma';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';
import { createE2ETestApp } from './helpers/e2e-test-app';
import { AuthHelper, type TestUser } from './auth-helper';
import { DatabaseCleaner } from './database-cleaner';

describe('Goals E2E 테스트', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let supabaseService: SupabaseService;
  let authHelper: AuthHelper;
  let testUser: TestUser;
  let databaseCleaner: DatabaseCleaner;

  beforeAll(async () => {
    app = await createE2ETestApp();

    prisma = app.get(PrismaService);
    supabaseService = app.get(SupabaseService);
    databaseCleaner = new DatabaseCleaner(prisma, supabaseService);
    await databaseCleaner.cleanDatabase();

    authHelper = new AuthHelper(app);
    testUser = await authHelper.registerUser({
      email: `test-goals-${Date.now()}@example.com`,
      password: 'testPassword123',
      fullName: 'Test User for Goals',
    });
  });

  beforeEach(async () => {
    await databaseCleaner.cleanTable('checkpoints');
    await databaseCleaner.cleanTable('plans');
    await databaseCleaner.cleanTable('goals');
  });

  afterAll(async () => {
    await databaseCleaner.cleanDatabase();
    await databaseCleaner.disconnect();
    await app.close();
  });

  describe('/goals (POST) 목표 생성 API', () => {
    it('새로운 목표를 성공적으로 생성해야 함', async () => {
      const createGoalDto = {
        title: 'Test Goal',
        category: 'personal',
        status: GoalStatus.ACTIVE,
        priority: Priority.HIGH,
      };

      const response = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(createGoalDto)
        .expect(201);

      expect(response.body.data).toHaveProperty('title', createGoalDto.title);
      expect(response.body.data).toHaveProperty('userId', testUser.id);
    });

    it('인증되지 않은 요청에 대해 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .post('/goals')
        .send({ title: 'Test Goal' })
        .expect(401);
    });
  });

  describe('/goals (GET) 목표 목록 조회 API', () => {
    it('인증된 사용자의 목표 목록을 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('/goals/:id (PATCH) 목표 수정 API', () => {
    it('다른 사용자의 목표 수정 시 403을 반환해야 함', async () => {
      const anotherUser = await authHelper.registerUser({
        email: `another-user-${Date.now()}@example.com`,
        password: 'anotherPassword123',
      });

      const response = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(anotherUser.accessToken!))
        .send({ title: 'Another User Goal', status: GoalStatus.ACTIVE })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/goals/${response.body.data.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({ title: 'Trying to Update' })
        .expect(403);
    });
  });

  describe('/goals/:id (DELETE) 목표 삭제 API', () => {
    it('다른 사용자의 목표 삭제 시 403을 반환해야 함', async () => {
      const anotherUser = await authHelper.registerUser({
        email: `another-delete-${Date.now()}@example.com`,
        password: 'anotherPassword123',
      });

      const response = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(anotherUser.accessToken!))
        .send({ title: 'Another User Goal', status: GoalStatus.ACTIVE })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/goals/${response.body.data.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(403);
    });
  });
});
