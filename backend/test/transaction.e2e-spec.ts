import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AuthHelper, type TestUser } from './auth-helper';
import { GoalStatus, PlanStatus, Priority } from '../generated/prisma';

describe('Database Transaction E2E', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authHelper: AuthHelper;
  let testUser: TestUser;

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

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();

    // Clean up test data
    await cleanDatabase();

    // Create auth helper and test user
    authHelper = new AuthHelper(app);
    testUser = await authHelper.registerUser({
      email: 'transaction-test@example.com',
      password: 'Test123!',
      fullName: 'Transaction Test User',
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

  describe('Goal and Plan Creation (Using Existing APIs)', () => {
    it('should create goal and plans separately', async () => {
      // Create a goal first
      const goalResponse = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          title: 'Goal with Plans',
          description: 'Testing goal and plan creation',
          deadline: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          category: 'test',
          status: GoalStatus.ACTIVE,
          priority: Priority.HIGH,
        })
        .expect(201);

      const goalId = goalResponse.body.data.id;
      expect(goalId).toBeDefined();

      // Create plans for the goal
      const plan1Response = await request(app.getHttpServer())
        .post('/plans')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          goalId,
          title: 'Plan 1',
          description: 'First plan',
          orderIndex: 1,
        })
        .expect(201);

      const plan2Response = await request(app.getHttpServer())
        .post('/plans')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          goalId,
          title: 'Plan 2',
          description: 'Second plan',
          orderIndex: 2,
        })
        .expect(201);

      expect(plan1Response.body.data.goalId).toBe(goalId);
      expect(plan2Response.body.data.goalId).toBe(goalId);

      // Verify goal with plans
      const goalWithPlans = await request(app.getHttpServer())
        .get(`/goals/${goalId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      expect(goalWithPlans.body.data.plans).toHaveLength(2);
    });
  });

  describe('Plan Update Operations', () => {
    let goalId: string;
    let planId: string;

    beforeEach(async () => {
      // Create a goal and plan for testing
      const goal = await prisma.goal.create({
        data: {
          title: 'Test Goal for Plan Updates',
          description: 'Testing plan updates',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          category: 'test',
          status: GoalStatus.ACTIVE,
          priority: Priority.MEDIUM,
          userId: testUser.id,
        },
      });
      goalId = goal.id;

      const plan = await prisma.plan.create({
        data: {
          title: 'Test Plan',
          description: 'Will be updated',
          goalId,
          orderIndex: 1,
          status: PlanStatus.PENDING,
        },
      });
      planId = plan.id;
    });

    it('should update plan details', async () => {
      const updateData = {
        title: 'Updated Plan Title',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/plans/${planId}?userId=${testUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(updateData)
        .expect(200);

      expect(response.body.data.title).toBe('Updated Plan Title');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should update plan status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/plans/${planId}/status?userId=${testUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          status: PlanStatus.IN_PROGRESS,
        })
        .expect(200);

      expect(response.body.data.status).toBe(PlanStatus.IN_PROGRESS);
    });
  });

  describe('Cascade Delete Operations', () => {
    it('should cascade delete all related data when deleting a goal', async () => {
      // Create a goal with related data
      const goal = await prisma.goal.create({
        data: {
          title: 'Goal to Delete',
          description: 'Testing cascade delete',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          category: 'test',
          status: GoalStatus.ACTIVE,
          priority: Priority.MEDIUM,
          userId: testUser.id,
          plans: {
            create: [
              {
                title: 'Plan 1',
                description: 'Will be deleted',
                orderIndex: 1,
                status: PlanStatus.PENDING,
              },
              {
                title: 'Plan 2',
                description: 'Also will be deleted',
                orderIndex: 2,
                status: PlanStatus.PENDING,
              },
            ],
          },
        },
      });

      // Verify data was created
      const plansBeforeDelete = await prisma.plan.findMany({
        where: { goalId: goal.id },
      });
      expect(plansBeforeDelete).toHaveLength(2);

      // Delete the goal
      await request(app.getHttpServer())
        .delete(`/goals/${goal.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      // Verify cascade delete
      const deletedGoal = await prisma.goal.findUnique({
        where: { id: goal.id },
      });
      expect(deletedGoal).toBeNull();

      const plansAfterDelete = await prisma.plan.findMany({
        where: { goalId: goal.id },
      });
      expect(plansAfterDelete).toHaveLength(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent goal creations without data corruption', async () => {
      const promises = Array(5)
        .fill(null)
        .map((_, index) =>
          request(app.getHttpServer())
            .post('/goals')
            .set(authHelper.getAuthHeader(testUser.accessToken!))
            .send({
              title: `Concurrent Goal ${index + 1}`,
              description: 'Testing concurrent operations',
              deadline: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              category: 'test',
              status: GoalStatus.ACTIVE,
              priority: Priority.MEDIUM,
            }),
        );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.data.id).toBeDefined();
      });

      // Verify all goals were created with unique IDs
      const goalIds = responses.map((r) => r.body.data.id);
      const uniqueIds = new Set(goalIds);
      expect(uniqueIds.size).toBe(5);

      // Verify data integrity
      const goals = await prisma.goal.findMany({
        where: {
          userId: testUser.id,
          title: { startsWith: 'Concurrent Goal' },
        },
      });
      expect(goals).toHaveLength(5);
    });

    it('should handle concurrent plan updates', async () => {
      // Create a goal and plan
      const goal = await prisma.goal.create({
        data: {
          title: 'Concurrent Update Test Goal',
          description: 'Testing concurrent updates',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          category: 'test',
          status: GoalStatus.ACTIVE,
          priority: Priority.MEDIUM,
          userId: testUser.id,
        },
      });

      const plan = await prisma.plan.create({
        data: {
          title: 'Concurrent Update Test Plan',
          description: 'Testing',
          goalId: goal.id,
          orderIndex: 1,
          status: PlanStatus.PENDING,
        },
      });

      // Attempt concurrent status updates
      const updatePromises = Array(3)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .patch(`/plans/${plan.id}/status?userId=${testUser.id}`)
            .set(authHelper.getAuthHeader(testUser.accessToken!))
            .send({
              status: PlanStatus.COMPLETED,
            }),
        );

      const updateResponses = await Promise.all(updatePromises);

      // All should succeed (idempotent operation)
      updateResponses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Verify final state
      const updatedPlan = await prisma.plan.findUnique({
        where: { id: plan.id },
      });
      expect(updatedPlan!.status).toBe(PlanStatus.COMPLETED);
    });
  });
});
