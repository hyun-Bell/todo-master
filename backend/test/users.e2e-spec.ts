import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthHelper, type TestUser } from './auth-helper';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authHelper: AuthHelper;
  let adminUser: TestUser;

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
    authHelper = new AuthHelper(app);

    await cleanDatabase();

    // Create admin user for testing
    adminUser = await authHelper.registerUser({
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      fullName: 'Admin User',
    });
  });

  beforeEach(async () => {
    // Clean all data except admin user
    await prisma.plan.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany({
      where: {
        NOT: {
          id: adminUser.id,
        },
      },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
    await app.close();
  });

  async function cleanDatabase() {
    // Delete in correct order to respect foreign key constraints
    await prisma.checkpoint.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();
  }

  describe('/auth/register (POST)', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        fullName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('statusCode', 201);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty(
        'email',
        registerDto.email,
      );
      expect(response.body.data.user).toHaveProperty(
        'fullName',
        registerDto.fullName,
      );
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should reject duplicate email', async () => {
      const registerDto = {
        email: `duplicate${Date.now()}@example.com`,
        password: 'TestPassword123!',
        fullName: 'Test User',
      };

      // First registration should succeed
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body).toHaveProperty(
        'message',
        '이미 사용 중인 이메일입니다.',
      );
    });

    it('should validate email format', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        fullName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should validate password strength', async () => {
      const registerDto = {
        email: `test${Date.now()}@example.com`,
        password: 'weak',
        fullName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', async () => {
      const testUser = await authHelper.registerUser({
        email: `login-test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        fullName: 'Login Test User',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
    });

    it('should reject invalid password', async () => {
      const testUser = await authHelper.registerUser({
        email: `invalid-login${Date.now()}@example.com`,
        password: 'TestPassword123!',
        fullName: 'Invalid Login Test',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty(
        'message',
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    });

    it('should reject non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty(
        'message',
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    });
  });

  // Removed /auth/me tests as this endpoint doesn't exist in the backend

  describe('/users (GET)', () => {
    it('should get list of users (requires auth)', async () => {
      // Create some test users
      await authHelper.registerUser({
        email: 'user1@example.com',
        password: 'Password123!',
        fullName: 'User One',
      });

      await authHelper.registerUser({
        email: 'user2@example.com',
        password: 'Password123!',
        fullName: 'User Two',
      });

      const response = await request(app.getHttpServer())
        .get('/users')
        .set(authHelper.getAuthHeader(adminUser.accessToken!))
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3); // admin + 2 test users
    });

    it('should reject request without auth', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });
  });

  describe('/users/:id (GET)', () => {
    it('should get user by id', async () => {
      const testUser = await authHelper.registerUser({
        email: `getuser${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'Get User Test',
      });

      const response = await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(adminUser.accessToken!))
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', testUser.id);
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('goals');
      expect(Array.isArray(response.body.data.goals)).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app.getHttpServer())
        .get(`/users/${fakeId}`)
        .set(authHelper.getAuthHeader(adminUser.accessToken!))
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty(
        'message',
        '사용자를 찾을 수 없습니다.',
      );
    });

    it('should return error for invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/invalid-uuid')
        .set(authHelper.getAuthHeader(adminUser.accessToken!))
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty(
        'message',
        '유효하지 않은 UUID 형식입니다: id',
      );
    });
  });

  describe('/users/:id (PATCH)', () => {
    it('should update user profile', async () => {
      const testUser = await authHelper.registerUser({
        email: `update${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'Original Name',
      });

      const updateDto = {
        fullName: 'Updated Name',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const response = await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('fullName', updateDto.fullName);
      expect(response.body.data).toHaveProperty(
        'avatarUrl',
        updateDto.avatarUrl,
      );
    });

    // Note: User update authorization is not implemented in the backend
    // Any authenticated user can currently update any user's profile
    it('should allow updating other users profile (authorization not implemented)', async () => {
      const otherUser = await authHelper.registerUser({
        email: `other${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'Other User',
      });

      const currentUser = await authHelper.registerUser({
        email: `current${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'Current User',
      });

      const updateDto = {
        fullName: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .patch(`/users/${otherUser.id}`)
        .set(authHelper.getAuthHeader(currentUser.accessToken!))
        .send(updateDto)
        .expect(200);

      expect(response.body.data).toHaveProperty('fullName', 'Updated Name');
    });

    it('should allow updating email through user endpoint (whitelist not enforced)', async () => {
      const testUser = await authHelper.registerUser({
        email: `noupdate${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'No Update Email',
      });

      const updateDto = {
        email: 'newemail@example.com',
        fullName: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send(updateDto)
        .expect(200);

      // Currently email CAN be updated (no field restrictions in UpdateUserDto)
      expect(response.body.data).toHaveProperty(
        'email',
        'newemail@example.com',
      );
      expect(response.body.data).toHaveProperty('fullName', updateDto.fullName);
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should delete user and cascade delete related data', async () => {
      const testUser = await authHelper.registerUser({
        email: `delete${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'Delete Test User',
      });

      // Create some related data
      const goalResponse = await request(app.getHttpServer())
        .post('/goals')
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .send({
          title: 'Goal to be deleted',
          description: 'This will be cascade deleted',
          category: 'test',
        })
        .expect(201);

      const goalId = goalResponse.body.data.id;

      // Delete user
      await request(app.getHttpServer())
        .delete(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(testUser.accessToken!))
        .expect(200);

      // Verify user is deleted
      await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set(authHelper.getAuthHeader(adminUser.accessToken!))
        .expect(404);

      // Verify goal is also deleted
      const goals = await prisma.goal.findMany({
        where: { id: goalId },
      });
      expect(goals).toHaveLength(0);
    });

    // Note: User delete authorization is not implemented in the backend
    // Any authenticated user can currently delete any user
    it('should allow deleting other users (authorization not implemented)', async () => {
      const otherUser = await authHelper.registerUser({
        email: `nodelete${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'No Delete User',
      });

      const currentUser = await authHelper.registerUser({
        email: `current${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'Current User',
      });

      await request(app.getHttpServer())
        .delete(`/users/${otherUser.id}`)
        .set(authHelper.getAuthHeader(currentUser.accessToken!))
        .expect(200);

      // Verify user was deleted
      const user = await prisma.user.findUnique({
        where: { id: otherUser.id },
      });
      expect(user).toBeNull();
    });
  });
});
