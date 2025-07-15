import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { type CreateUserDto } from '../src/users/dto/create-user.dto';
import { PrismaService } from '../src/prisma/prisma.service';
// UUID 생성 함수
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
    await app.close();
  });

  async function cleanDatabase() {
    // Delete in correct order to respect foreign key constraints
    await prisma.plan.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.user.deleteMany();
  }

  describe('/users (POST)', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        id: generateUUID(),
        email: `test${Date.now()}@example.com`,
        fullName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toHaveProperty('statusCode', 201);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', createUserDto.id);
      expect(response.body.data).toHaveProperty('email', createUserDto.email);
      expect(response.body.data).toHaveProperty(
        'fullName',
        createUserDto.fullName,
      );
    });

    it('should return validation error for invalid email', () => {
      const invalidDto = {
        id: generateUUID(),
        email: 'invalid-email',
        fullName: 'Test User',
      };

      return request(app.getHttpServer())
        .post('/users')
        .send(invalidDto)
        .expect(400)
        .then((response) => {
          expect(response.body).toHaveProperty('error', 'Bad Request');
          const messages = Array.isArray(response.body.message)
            ? response.body.message
            : [response.body.message];
          expect(
            messages.some((msg: string) =>
              msg.includes('email must be an email'),
            ),
          ).toBe(true);
        });
    });

    it('should return validation error for invalid UUID', () => {
      const invalidDto = {
        id: 'invalid-uuid',
        email: 'test@example.com',
        fullName: 'Test User',
      };

      return request(app.getHttpServer())
        .post('/users')
        .send(invalidDto)
        .expect(400)
        .then((response) => {
          expect(response.body).toHaveProperty('error', 'Bad Request');
          const messages = Array.isArray(response.body.message)
            ? response.body.message
            : [response.body.message];
          expect(
            messages.some((msg: string) => msg.includes('id must be a UUID')),
          ).toBe(true);
        });
    });

    it('should check for duplicate emails', async () => {
      const email = `duplicate${Date.now()}@example.com`;
      const createUserDto: CreateUserDto = {
        id: generateUUID(),
        email,
        fullName: 'Duplicate User',
      };

      // 첫 번째 사용자 생성
      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      // 같은 이메일로 두 번째 사용자 생성 시도
      return request(app.getHttpServer())
        .post('/users')
        .send({
          ...createUserDto,
          id: generateUUID(), // Different ID but same email
        })
        .expect(409)
        .then((response) => {
          expect(response.body.message).toContain('이미 존재하는 이메일');
        });
    });
  });

  describe('/users (GET)', () => {
    it('should return an array of users', async () => {
      // Create a user first
      await request(app.getHttpServer())
        .post('/users')
        .send({
          id: generateUUID(),
          email: `test${Date.now()}@example.com`,
          fullName: 'Test User',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return user with goals', async () => {
      // Create a user
      const userId = generateUUID();
      await request(app.getHttpServer())
        .post('/users')
        .send({
          id: userId,
          email: `test${Date.now()}@example.com`,
          fullName: 'Test User',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', userId);
      expect(response.body.data).toHaveProperty('goals');
      expect(Array.isArray(response.body.data.goals)).toBe(true);
    });

    it('should return 404 for non-existent user', () => {
      const nonExistentId = generateUUID();

      return request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .expect(404)
        .then((response) => {
          expect(response.body).toHaveProperty('error', 'Not Found');
          expect(response.body.message).toContain('사용자를 찾을 수 없습니다');
        });
    });
  });

  describe('/users/:id (PATCH)', () => {
    let testUserId: string;

    beforeEach(async () => {
      // 각 테스트마다 새로운 사용자 생성
      testUserId = generateUUID();
      await request(app.getHttpServer())
        .post('/users')
        .send({
          id: testUserId,
          email: `update-test${Date.now()}@example.com`,
          fullName: 'Update Test User',
        })
        .expect(201);
    });

    it('should update user successfully', () => {
      const updateDto = {
        fullName: 'Updated Name',
      };

      return request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .send(updateDto)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('statusCode', 200);
          expect(response.body.data).toHaveProperty('fullName', 'Updated Name');
        });
    });

    it('should return 404 when updating non-existent user', () => {
      const nonExistentId = generateUUID();
      const updateDto = {
        email: 'updated@example.com',
      };

      return request(app.getHttpServer())
        .patch(`/users/${nonExistentId}`)
        .send(updateDto)
        .expect(404);
    });

    it('should validate email format on update', () => {
      const invalidUpdateDto = {
        email: 'invalid-email',
      };

      return request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .send(invalidUpdateDto)
        .expect(400)
        .then((response) => {
          const messages = Array.isArray(response.body.message)
            ? response.body.message
            : [response.body.message];
          expect(
            messages.some((msg: string) =>
              msg.includes('email must be an email'),
            ),
          ).toBe(true);
        });
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should delete user successfully', async () => {
      const userId = generateUUID();

      // 삭제할 사용자 생성
      await request(app.getHttpServer())
        .post('/users')
        .send({
          id: userId,
          email: `delete-test${Date.now()}@example.com`,
          fullName: 'Delete Test User',
        })
        .expect(201);

      // 사용자 삭제
      const response = await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body.data).toHaveProperty('message');

      // 삭제 확인
      await request(app.getHttpServer()).get(`/users/${userId}`).expect(404);
    });

    it('should return 404 when deleting non-existent user', () => {
      const nonExistentId = generateUUID();

      return request(app.getHttpServer())
        .delete(`/users/${nonExistentId}`)
        .expect(404);
    });
  });
});
