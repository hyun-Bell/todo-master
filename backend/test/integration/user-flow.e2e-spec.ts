import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { GoalStatus, PlanStatus, Priority } from '../../generated/prisma';
import { AuthHelper, type TestUser } from '../auth-helper';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('User Flow Integration (e2e)', () => {
  let app: INestApplication<App>;
  let authHelper: AuthHelper;
  let prisma: PrismaService;
  let testUser: TestUser;
  let createdGoalId: string;
  let createdPlanId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    authHelper = new AuthHelper(app);
    prisma = app.get<PrismaService>(PrismaService);

    // Clean database before tests
    await cleanDatabase();

    // Create test user
    testUser = await authHelper.registerUser({
      email: `integration-test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      fullName: 'Integration Test User',
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
    await app.close();
  });

  async function cleanDatabase() {
    await prisma.checkpoint.deleteMany({});
    await prisma.plan.deleteMany({});
    await prisma.goal.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.user.deleteMany({});
  }

  describe('Complete User Journey', () => {
    it('Step 1: Verify user was created and can login', async () => {
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

    it('Step 2: Get user profile', async () => {
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

    it('Step 3: Create a goal for the user', async () => {
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

    it('Step 4: Create a plan for the goal', async () => {
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

    it('Step 5: Update plan status to in progress', async () => {
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

    it('Step 6: Get user goals with plans', async () => {
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

    it('Step 7: Complete the plan', async () => {
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

    it('Step 8: Complete the goal', async () => {
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

    it('Step 9: Verify cascading delete when deleting goal', async () => {
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
