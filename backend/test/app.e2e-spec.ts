import { type INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';

import { createE2ETestApp } from './helpers/e2e-test-app';

describe('AppController E2E 테스트', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2ETestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET) 루트 엔드포인트 테스트', () =>
    request(app.getHttpServer())
      .get('/')
      .expect(200)
      .then((response: request.Response) => {
        expect(response.body).toHaveProperty('statusCode', 200);
        expect(response.body).toHaveProperty(
          'message',
          '요청이 성공적으로 처리되었습니다.',
        );
        expect(response.body).toHaveProperty(
          'data',
          'TodoMaster Backend API is running! 🚀',
        );
        expect(response.body).toHaveProperty('timestamp');
      }));

  it('/health (GET)', () =>
    request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .then((response: request.Response) => {
        const body = response.body as {
          statusCode: number;
          message: string;
          data: {
            status: string;
            server: string;
            database: string;
            timestamp: string;
          };
          timestamp: string;
        };
        expect(body).toHaveProperty('statusCode', 200);
        expect(body).toHaveProperty(
          'message',
          '요청이 성공적으로 처리되었습니다.',
        );
        expect(body).toHaveProperty('data');
        expect(body.data).toHaveProperty('status');
        expect(body.data).toHaveProperty('server', 'running');
        expect(body.data).toHaveProperty('database');
        expect(body.data).toHaveProperty('timestamp');
        expect(body).toHaveProperty('timestamp');
      }));
});
