import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

export async function createE2ETestApp(): Promise<INestApplication> {
  // 테스트 환경 변수 설정
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/todomaster_test';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider('RealtimeService')
    .useValue({
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      subscribeToTable: jest.fn(),
      unsubscribeFromTable: jest.fn(),
      subscribeUserToChanges: jest.fn(),
      testConnection: jest.fn().mockResolvedValue(true),
    })
    .compile();

  const app = moduleFixture.createNestApplication();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();

  return app;
}
