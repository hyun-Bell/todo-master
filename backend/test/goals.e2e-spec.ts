import { type INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';
import { GoalStatus, Priority } from '../src/../generated/prisma';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2ETestApp } from './setup-e2e';
import { AuthHelper, type TestUser } from './auth-helper';

// UUID 생성 함수
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

describe('Goals (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authHelper: AuthHelper;
  let testUser: TestUser;

  beforeAll(async () => {
    app = await createE2ETestApp();

    // Get PrismaService instance and clean database
    prisma = app.get(PrismaService);
    await cleanDatabase();

    // Create auth helper and register test user
    authHelper = new AuthHelper(app);
    testUser = await authHelper.registerUser({
      email: `test-goals-${Date.now()}@example.com`,
      password: 'testPassword123',
      fullName: 'Test User for Goals',
    });
  });

  beforeEach(async () => {
    // Clean only goals and plans, keep the test user
    await prisma.plan.deleteMany();
    await prisma.goal.deleteMany();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
    await app.close();
  });

  async function cleanDatabase() {
    await prisma.plan.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.user.deleteMany();
  }

  describe('/goals (POST)', () => {
    it('should create a new goal', async () => {
      const createGoalDto = {
        title: 'Test Goal',
        description: 'Test Description',
        category: 'personal',
        deadline: '2024-12-31T23:59:59.999Z',
        status: GoalStatus.ACTIVE,
        priority: Priority.HIGH,
      };

      const response = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(createGoalDto);

      // 응답 디버깅
      if (response.status !== 201) {
        console.error('Response status:', response.status);
        console.error('Response body:', response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('statusCode', 201);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('title', createGoalDto.title);
      expect(response.body.data).toHaveProperty('status', createGoalDto.status);
      expect(response.body.data).toHaveProperty(
        'priority',
        createGoalDto.priority,
      );
      expect(response.body.data).toHaveProperty('userId', testUser.id);
    });

    it('should return validation error for missing required fields', () => {
      const invalidDto = {
        description: 'Test Description',
      };

      return request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(invalidDto)
        .expect(400)
        .then((response) => {
          expect(response.body).toHaveProperty('error', 'Bad Request');
          const messages = Array.isArray(response.body.message)
            ? response.body.message
            : [response.body.message];
          expect(
            messages.some((msg: string) =>
              msg.includes('title should not be empty'),
            ),
          ).toBe(true);
        });
    });

    it('should return validation error for invalid date format', () => {
      const invalidDto = {
        title: 'Test Goal',
        deadline: 'invalid-date',
      };

      return request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(invalidDto)
        .expect(400)
        .then((response) => {
          expect(response.body).toHaveProperty('error', 'Bad Request');
          const messages = Array.isArray(response.body.message)
            ? response.body.message
            : [response.body.message];
          expect(
            messages.some((msg: string) =>
              msg.includes('deadline must be a valid ISO 8601 date string'),
            ),
          ).toBe(true);
        });
    });

    it('should return 401 for unauthenticated request', () => {
      const createGoalDto = {
        title: 'Test Goal',
        description: 'Test Description',
        category: 'personal',
        deadline: '2024-12-31T23:59:59.999Z',
        status: GoalStatus.ACTIVE,
        priority: Priority.HIGH,
      };

      return request(app.getHttpServer())
        .post('/goals')
        .send(createGoalDto)
        .expect(401)
        .then((response) => {
          expect(response.body.message).toContain('Unauthorized');
        });
    });
  });

  describe('/goals (GET)', () => {
    beforeEach(async () => {
      // Create some test goals
      await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          title: 'Goal 1',
          description: 'Description 1',
          category: 'work',
          status: GoalStatus.ACTIVE,
          priority: Priority.HIGH,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          title: 'Goal 2',
          description: 'Description 2',
          category: 'personal',
          status: GoalStatus.COMPLETED,
          priority: Priority.MEDIUM,
        })
        .expect(201);
    });

    it('should return an array of goals', async () => {
      const response = await request(app.getHttpServer())
        .get('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should return only authenticated user goals', async () => {
      const response = await request(app.getHttpServer())
        .get('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // 모든 목표가 현재 인증된 사용자의 목표여야 함
      response.body.data.forEach((goal: any) => {
        expect(goal.userId).toBe(testUser.id);
      });
    });
  });

  describe('/goals/:id (GET)', () => {
    let goalId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          title: 'Test Goal',
          description: 'Test Description',
          category: 'personal',
          status: GoalStatus.ACTIVE,
          priority: Priority.HIGH,
        })
        .expect(201);

      goalId = response.body.data.id;
    });

    it('should return a goal by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/goals/${goalId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', goalId);
      expect(response.body.data).toHaveProperty('plans');
      expect(Array.isArray(response.body.data.plans)).toBe(true);
    });

    it('should return 404 for non-existent goal', () => {
      const nonExistentId = generateUUID();

      return request(app.getHttpServer())
        .get(`/goals/${nonExistentId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(404)
        .then((response) => {
          expect(response.body).toHaveProperty('error', 'Not Found');
          expect(response.body.message).toContain('목표를 찾을 수 없습니다');
        });
    });
  });

  describe('/goals/:id (PATCH)', () => {
    let goalId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          title: 'Test Goal',
          description: 'Test Description',
          category: 'personal',
          status: GoalStatus.ACTIVE,
          priority: Priority.HIGH,
        })
        .expect(201);

      goalId = response.body.data.id;
    });

    it('should update goal successfully', async () => {
      const updateDto = {
        title: 'Updated Goal Title',
        status: GoalStatus.COMPLETED,
      };

      const response = await request(app.getHttpServer())
        .patch(`/goals/${goalId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body.data).toHaveProperty('title', 'Updated Goal Title');
      expect(response.body.data).toHaveProperty('status', GoalStatus.COMPLETED);
    });

    it('should return 404 when updating non-existent goal', () => {
      const nonExistentId = generateUUID();
      const updateDto = {
        title: 'Updated Goal',
        status: GoalStatus.COMPLETED,
      };

      return request(app.getHttpServer())
        .patch(`/goals/${nonExistentId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(updateDto)
        .expect(404);
    });

    it('should validate status enum', () => {
      const invalidUpdateDto = {
        status: 'INVALID_STATUS',
      };

      return request(app.getHttpServer())
        .patch(`/goals/${goalId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(invalidUpdateDto)
        .expect(400)
        .then((response) => {
          const messages = Array.isArray(response.body.message)
            ? response.body.message
            : [response.body.message];
          expect(
            messages.some((msg: string) =>
              msg.includes('status must be one of the following values'),
            ),
          ).toBe(true);
        });
    });

    it("should return 403 when trying to update another user's goal", async () => {
      // Create another user and their goal
      const anotherUser = await authHelper.registerUser({
        email: `another-user-${Date.now()}@example.com`,
        password: 'anotherPassword123',
      });

      const response = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(anotherUser.accessToken!))
        .send({
          title: 'Another User Goal',
          status: GoalStatus.ACTIVE,
        })
        .expect(201);

      const anotherGoalId = response.body.data.id;

      // Try to update another user's goal
      const updateDto = {
        title: 'Trying to Update Another User Goal',
      };

      return request(app.getHttpServer())
        .patch(`/goals/${anotherGoalId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(updateDto)
        .expect(403)
        .then((response) => {
          expect(response.body.message).toContain(
            '이 목표를 수정할 권한이 없습니다',
          );
        });
    });
  });

  describe('/goals/:id (DELETE)', () => {
    let goalId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          title: 'Test Goal to Delete',
          description: 'Test Description',
          category: 'personal',
          status: GoalStatus.ACTIVE,
          priority: Priority.HIGH,
        })
        .expect(201);

      goalId = response.body.data.id;
    });

    it('should delete goal successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/goals/${goalId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body.data).toHaveProperty('message');

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/goals/${goalId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(404);
    });

    it('should return 404 when deleting non-existent goal', () => {
      const nonExistentId = generateUUID();

      return request(app.getHttpServer())
        .delete(`/goals/${nonExistentId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(404);
    });

    it('should return 401 when not authenticated', () => {
      return request(app.getHttpServer())
        .delete(`/goals/${goalId}`)
        .expect(401)
        .then((response) => {
          expect(response.body.message).toContain('Unauthorized');
        });
    });

    it("should return 403 when trying to delete another user's goal", async () => {
      // Create another user and their goal
      const anotherUser = await authHelper.registerUser({
        email: `another-delete-user-${Date.now()}@example.com`,
        password: 'anotherPassword123',
      });

      const response = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(anotherUser.accessToken!))
        .send({
          title: 'Another User Goal to Delete',
          status: GoalStatus.ACTIVE,
        })
        .expect(201);

      const anotherGoalId = response.body.data.id;

      // Try to delete another user's goal
      return request(app.getHttpServer())
        .delete(`/goals/${anotherGoalId}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(403)
        .then((response) => {
          expect(response.body.message).toContain(
            '이 목표를 삭제할 권한이 없습니다',
          );
        });
    });
  });
});
