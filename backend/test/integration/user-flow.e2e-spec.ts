import { type INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';
import { GoalStatus, PlanStatus, Priority } from '../../generated/prisma';
import { AuthHelper, type TestUser } from '../auth-helper';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SupabaseService } from '../../src/supabase/supabase.service';
import { createE2ETestApp } from '../helpers/e2e-test-app';
import { DatabaseCleaner } from '../database-cleaner';

describe('사용자 플로우 통합 E2E 테스트', () => {
  let app: INestApplication<App>;
  let authHelper: AuthHelper;
  let prisma: PrismaService;
  let supabaseService: SupabaseService;
  let testUser: TestUser;
  let createdGoalId: string;
  let createdPlanId: string;
  let databaseCleaner: DatabaseCleaner;

  beforeAll(async () => {
    app = await createE2ETestApp();

    authHelper = new AuthHelper(app);
    prisma = app.get<PrismaService>(PrismaService);
    supabaseService = app.get<SupabaseService>(SupabaseService);
    databaseCleaner = new DatabaseCleaner(prisma, supabaseService);

    // Clean database before tests
    await databaseCleaner.cleanDatabase();

    // Create test user
    testUser = await authHelper.registerUser({
      email: `integration-test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      fullName: 'Integration Test User',
    });
  });

  afterAll(async () => {
    await databaseCleaner.cleanDatabase();
    await databaseCleaner.disconnect();
    await app.close();
  });

  describe('완전한 사용자 여정', () => {
    it('1단계: 사용자가 생성되고 로그인할 수 있는지 확인', async () => {
      // Try to login with created user
      const loginToken = await authHelper.loginUser(
        testUser.email,
        testUser.password,
      );
      expect(loginToken).toBeDefined();
      // JWT tokens will be different due to different iat (issued at) timestamps
      // Instead, verify that we can use the new token to make authenticated requests
      const response = await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(loginToken))
        .expect(200);

      expect(response.body.data).toHaveProperty('id', testUser.id);

      // Update testUser's access token for subsequent tests
      testUser.accessToken = loginToken;
    });

    it('2단계: 사용자 프로필 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', testUser.id);
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('fullName', testUser.fullName);
    });

    it('3단계: 사용자를 위한 목표 생성', async () => {
      const createGoalDto = {
        title: '2024년 운동 목표',
        description: '매주 3회 이상 운동하기',
        category: 'health',
        deadline: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        status: GoalStatus.ACTIVE,
        priority: Priority.HIGH,
      };

      const response = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(createGoalDto)
        .expect(201);

      expect(response.body).toHaveProperty('statusCode', 201);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title', createGoalDto.title);
      expect(response.body.data).toHaveProperty('userId', testUser.id);

      createdGoalId = response.body.data.id;
    });

    it('4단계: 목표를 위한 계획 생성', async () => {
      const createPlanDto = {
        goalId: createdGoalId,
        title: '주 3회 러닝',
        description: '월, 수, 금 30분씩 러닝하기',
        orderIndex: 1,
        status: PlanStatus.PENDING,
      };

      const response = await request(app.getHttpServer())
        .post('/plans')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(createPlanDto)
        .expect(201);

      expect(response.body).toHaveProperty('statusCode', 201);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title', createPlanDto.title);
      expect(response.body.data).toHaveProperty('goalId', createdGoalId);

      createdPlanId = response.body.data.id;
    });

    it('5단계: 계획 상태를 진행 중으로 업데이트', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/plans/${createdPlanId}/status?userId=${testUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          status: PlanStatus.IN_PROGRESS,
        })
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty(
        'status',
        PlanStatus.IN_PROGRESS,
      );
    });

    it('6단계: 계획과 함께 사용자 목표 조회', async () => {
      const response = await request(app.getHttpServer())
        .get('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const goal = response.body.data.find((g: any) => g.id === createdGoalId);
      expect(goal).toBeDefined();
      expect(goal.plans).toBeDefined();
      expect(goal.plans.length).toBeGreaterThan(0);
    });

    it('7단계: 계획 완료', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/plans/${createdPlanId}/status?userId=${testUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          status: PlanStatus.COMPLETED,
        })
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body.data).toHaveProperty('status', PlanStatus.COMPLETED);
    });

    it('8단계: 목표 완료', async () => {
      const updateDto = {
        status: GoalStatus.COMPLETED,
      };

      const response = await request(app.getHttpServer())
        .patch(`/goals/${createdGoalId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body.data).toHaveProperty('status', GoalStatus.COMPLETED);
    });

    it('9단계: 목표 삭제 시 연속 삭제 확인', async () => {
      // Create a new goal with plan for delete test
      const goal = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          title: 'Goal to be deleted',
          description: 'This goal will be deleted',
          category: 'test',
          deadline: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .expect(201);

      const goalId = goal.body.data.id;

      // Create a plan for this goal
      const plan = await request(app.getHttpServer())
        .post('/plans')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          goalId,
          title: 'Plan to be cascade deleted',
          description: 'This plan should be deleted with goal',
        })
        .expect(201);

      const planId = plan.body.data.id;

      // Delete the goal
      await request(app.getHttpServer())
        .delete(`/goals/${goalId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      // Verify goal is deleted
      await request(app.getHttpServer())
        .get(`/goals/${goalId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(404);

      // Verify plan is also deleted (cascade)
      const plans = await prisma.plan.findMany({
        where: { id: planId },
      });
      expect(plans).toHaveLength(0);
    });
  });
});
