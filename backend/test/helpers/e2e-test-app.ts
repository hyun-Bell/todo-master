import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';

export async function createE2ETestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable shutdown hooks
  app.enableShutdownHooks();

  await app.init();
  return app;
}
