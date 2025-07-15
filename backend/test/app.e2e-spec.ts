import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 실제 앱과 동일한 설정 적용
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

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .then((response: request.Response) => {
        expect(response.body).toHaveProperty('statusCode', 200);
        expect(response.body).toHaveProperty(
          'data',
          'TodoMaster Backend API is running! 🚀',
        );
      });
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .then((response: request.Response) => {
        const body = response.body as {
          statusCode: number;
          data: { status: string; server: string; timestamp: string };
        };
        expect(body).toHaveProperty('statusCode', 200);
        expect(body).toHaveProperty('data');
        expect(body.data).toHaveProperty('status');
        expect(body.data).toHaveProperty('server', 'running');
        expect(body.data).toHaveProperty('timestamp');
      });
  });
});
