import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { GoalStatus, PlanStatus, Priority } from '../../generated/prisma';

describe('User Flow Integration (e2e)', () => {
  let app: INestApplication<App>;
  let createdUserId: string;
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete User Journey', () => {
    it('Step 1: Create a new user', async () => {
      const createUserDto = {
        id: `123e4567-e89b-12d3-a456-${Date.now().toString().slice(-12)}`,
        email: `test${Date.now()}@example.com`,
        fullName: 'Integration Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toHaveProperty('statusCode', 201);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email', createUserDto.email);
      expect(response.body.data).toHaveProperty(
        'fullName',
        createUserDto.fullName,
      );

      createdUserId = response.body.data.id;
    });

    it('Step 2: Verify user was created', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', createdUserId);
      expect(response.body.data).toHaveProperty('goals');
      expect(response.body.data.goals).toEqual([]);
    });

    it('Step 3: Create a goal for the user', async () => {
      const createGoalDto = {
        userId: createdUserId,
        title: '2024년 운동 목표',
        description: '매주 3회 이상 운동하기',
        category: 'health',
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
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title', createGoalDto.title);
      expect(response.body.data).toHaveProperty('userId', createdUserId);

      createdGoalId = response.body.data.id;
    });

    it('Step 4: Create a plan for the goal', async () => {
      const createPlanDto = {
        goalId: createdGoalId,
        title: '주 3회 헬스장 가기',
        description: '월수금 저녁 7시 헬스장',
        orderIndex: 1,
        estimatedDuration: 60,
        status: PlanStatus.PENDING,
      };

      const response = await request(app.getHttpServer())
        .post('/plans')
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
      const updateDto = {
        status: PlanStatus.IN_PROGRESS,
      };

      const response = await request(app.getHttpServer())
        .patch(`/plans/${createdPlanId}?userId=${createdUserId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty(
        'status',
        PlanStatus.IN_PROGRESS,
      );
    });

    it('Step 6: Get all plans for the goal', async () => {
      const response = await request(app.getHttpServer())
        .get(`/plans?goalId=${createdGoalId}`)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('goalId', createdGoalId);
      expect(response.body.data[0]).toHaveProperty(
        'status',
        PlanStatus.IN_PROGRESS,
      );
    });

    it('Step 7: Update goal status', async () => {
      const updateDto = {
        status: GoalStatus.COMPLETED,
        userId: createdUserId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/goals/${createdGoalId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', GoalStatus.COMPLETED);
    });

    it('Step 8: Get user with goals', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('goals');
      expect(response.body.data.goals.length).toBeGreaterThan(0);
      expect(response.body.data.goals[0]).toHaveProperty(
        'status',
        GoalStatus.COMPLETED,
      );
    });

    it('Step 9: Delete plan', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/plans/${createdPlanId}?userId=${createdUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('message');
    });

    it('Step 10: Delete goal', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/goals/${createdGoalId}?userId=${createdUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('message');
    });

    it('Step 11: Delete user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('message');
    });
  });

  describe('Error Scenarios', () => {
    it('Should enforce user ownership when updating goals', async () => {
      const timestamp = Date.now();
      // 두 명의 사용자 생성
      const user1Response = await request(app.getHttpServer())
        .post('/users')
        .send({
          id: `a23e4567-e89b-12d3-a456-${timestamp.toString().slice(-12)}`,
          email: `user1-${timestamp}@example.com`,
          fullName: 'User 1',
        })
        .expect(201);

      const user2Response = await request(app.getHttpServer())
        .post('/users')
        .send({
          id: `b23e4567-e89b-12d3-a456-${timestamp.toString().slice(-12)}`,
          email: `user2-${timestamp}@example.com`,
          fullName: 'User 2',
        })
        .expect(201);

      const user1Id = user1Response.body.data.id;
      const user2Id = user2Response.body.data.id;

      // User1의 목표 생성
      const goalResponse = await request(app.getHttpServer())
        .post('/goals')
        .send({
          userId: user1Id,
          title: 'User1의 목표',
          description: '설명',
          category: 'personal',
          deadline: '2024-12-31T23:59:59.999Z',
          status: GoalStatus.ACTIVE,
          priority: Priority.MEDIUM,
        })
        .expect(201);

      const goalId = goalResponse.body.data.id;

      // User2가 User1의 목표를 수정하려고 시도
      await request(app.getHttpServer())
        .patch(`/goals/${goalId}`)
        .send({
          userId: user2Id,
          title: '수정된 제목',
        })
        .expect(403);

      // 정리: 생성한 데이터 삭제
      await request(app.getHttpServer())
        .delete(`/goals/${goalId}?userId=${user1Id}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/users/${user1Id}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/users/${user2Id}`)
        .expect(200);
    });

    it('Should enforce user ownership when updating plans', async () => {
      const timestamp = Date.now();
      // 사용자 생성
      const userResponse = await request(app.getHttpServer())
        .post('/users')
        .send({
          id: `c23e4567-e89b-12d3-a456-${timestamp.toString().slice(-12)}`,
          email: `user-plan-${timestamp}@example.com`,
          fullName: 'Test User',
        })
        .expect(201);

      const userId = userResponse.body.data.id;

      // 목표 생성
      const goalResponse = await request(app.getHttpServer())
        .post('/goals')
        .send({
          userId,
          title: '테스트 목표',
          description: '설명',
          category: 'work',
          deadline: '2024-12-31T23:59:59.999Z',
          status: GoalStatus.ACTIVE,
          priority: Priority.MEDIUM,
        })
        .expect(201);

      const goalId = goalResponse.body.data.id;

      // 계획 생성
      const planResponse = await request(app.getHttpServer())
        .post('/plans')
        .send({
          goalId,
          title: '테스트 계획',
          description: '계획 설명',
          orderIndex: 1,
          estimatedDuration: 30,
          status: PlanStatus.PENDING,
        })
        .expect(201);

      const planId = planResponse.body.data.id;

      // 다른 사용자 ID로 계획 수정 시도
      await request(app.getHttpServer())
        .patch(`/plans/${planId}?userId=wrong-user-id`)
        .send({
          title: '수정된 계획',
        })
        .expect(403);

      // 정리: 생성한 데이터 삭제
      await request(app.getHttpServer())
        .delete(`/plans/${planId}?userId=${userId}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/goals/${goalId}?userId=${userId}`)
        .expect(200);

      await request(app.getHttpServer()).delete(`/users/${userId}`).expect(200);
    });
  });
});
