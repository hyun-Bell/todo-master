import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { GoalStatus, Priority } from '../src/../generated/prisma';
import { PrismaService } from '../src/prisma/prisma.service';

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
  let testUserId: string;

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

    // Get PrismaService instance and clean database
    prisma = app.get(PrismaService);
    await cleanDatabase();

    // Create a test user for all tests
    testUserId = await createTestUser();
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

  async function createTestUser(): Promise<string> {
    const userId = generateUUID();
    await request(app.getHttpServer())
      .post('/users')
      .send({
        id: userId,
        email: `test-goals-${Date.now()}@example.com`,
        fullName: 'Test User for Goals',
      })
      .expect(201);
    return userId;
  }

  describe('/goals (POST)', () => {
    it('should create a new goal', async () => {
      const createGoalDto = {
        userId: testUserId,
        title: 'Test Goal',
        description: 'Test Description',
        category: 'personal',
        deadline: '2024-12-31T23:59:59.999Z',
        status: GoalStatus.ACTIVE,
        priority: Priority.HIGH,
      };

      const response = await request(app.getHttpServer())
        .post('/goals')
        .send(createGoalDto)
        .expect(201);

      expect(response.body).toHaveProperty('statusCode', 201);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('title', createGoalDto.title);
      expect(response.body.data).toHaveProperty('status', createGoalDto.status);
      expect(response.body.data).toHaveProperty(
        'priority',
        createGoalDto.priority,
      );
      expect(response.body.data).toHaveProperty('userId', testUserId);
    });

    it('should return validation error for missing required fields', () => {
      const invalidDto = {
        description: 'Test Description',
      };

      return request(app.getHttpServer())
        .post('/goals')
        .send(invalidDto)
        .expect(400)
        .then((response) => {
          expect(response.body).toHaveProperty('error', 'Bad Request');
          const messages = Array.isArray(response.body.message)
            ? response.body.message
            : [response.body.message];
          expect(
            messages.some((msg: string) =>
              msg.includes('userId must be a UUID'),
            ),
          ).toBe(true);
          expect(
            messages.some((msg: string) =>
              msg.includes('title should not be empty'),
            ),
          ).toBe(true);
        });
    });

    it('should return validation error for invalid date format', () => {
      const invalidDto = {
        userId: testUserId,
        title: 'Test Goal',
        deadline: 'invalid-date',
      };

      return request(app.getHttpServer())
        .post('/goals')
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

    it('should return 404 for non-existent user', () => {
      const createGoalDto = {
        userId: generateUUID(), // Non-existent user
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
        .expect(404)
        .then((response) => {
          expect(response.body.message).toContain('사용자를 찾을 수 없습니다');
        });
    });
  });

  describe('/goals (GET)', () => {
    beforeEach(async () => {
      // Create some test goals
      await request(app.getHttpServer())
        .post('/goals')
        .send({
          userId: testUserId,
          title: 'Goal 1',
          description: 'Description 1',
          category: 'work',
          status: GoalStatus.ACTIVE,
          priority: Priority.HIGH,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/goals')
        .send({
          userId: testUserId,
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
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter goals by userId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/goals?userId=${testUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((goal: any) => {
        expect(goal.userId).toBe(testUserId);
      });
    });
  });

  describe('/goals/:id (GET)', () => {
    let goalId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/goals')
        .send({
          userId: testUserId,
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
        .send({
          userId: testUserId,
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
        userId: testUserId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/goals/${goalId}`)
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
        .send(updateDto)
        .expect(404);
    });

    it('should validate status enum', () => {
      const invalidUpdateDto = {
        status: 'INVALID_STATUS',
      };

      return request(app.getHttpServer())
        .patch(`/goals/${goalId}`)
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

    it('should return 403 when updating goal with wrong userId', () => {
      const updateDto = {
        title: 'Updated Goal',
        userId: generateUUID(), // Different user
      };

      return request(app.getHttpServer())
        .patch(`/goals/${goalId}`)
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
        .send({
          userId: testUserId,
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
        .delete(`/goals/${goalId}?userId=${testUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body.data).toHaveProperty('message');

      // Verify deletion
      await request(app.getHttpServer()).get(`/goals/${goalId}`).expect(404);
    });

    it('should return 404 when deleting non-existent goal', () => {
      const nonExistentId = generateUUID();

      return request(app.getHttpServer())
        .delete(`/goals/${nonExistentId}?userId=${testUserId}`)
        .expect(404);
    });

    it('should return 403 when userId is missing', () => {
      return request(app.getHttpServer())
        .delete(`/goals/${goalId}`)
        .expect(403)
        .then((response) => {
          expect(response.body.message).toContain('userId가 필요합니다');
        });
    });

    it('should return 403 when deleting goal with wrong userId', () => {
      return request(app.getHttpServer())
        .delete(`/goals/${goalId}?userId=${generateUUID()}`)
        .expect(403)
        .then((response) => {
          expect(response.body.message).toContain(
            '이 목표를 삭제할 권한이 없습니다',
          );
        });
    });
  });
});
