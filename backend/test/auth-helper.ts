import { type INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  fullName?: string;
  accessToken?: string;
}

export class AuthHelper {
  constructor(private readonly app: INestApplication<App>) {}

  async registerUser(userData: Partial<TestUser>): Promise<TestUser> {
    const user: TestUser = {
      id: '',
      email: userData.email || `test-${Date.now()}@example.com`,
      password: userData.password || 'testPassword123',
      fullName: userData.fullName || 'Test User',
    };

    const response = await request
      .default(this.app.getHttpServer())
      .post('/auth/register')
      .send({
        email: user.email,
        password: user.password,
        fullName: user.fullName,
      });

    if (response.status !== 201) {
      console.error('Register failed:', response.status, response.body);
    }

    expect(response.status).toBe(201);

    // TransformInterceptor가 응답을 감싸므로 data 속성에서 실제 데이터를 가져옴
    const { data } = response.body;
    user.id = data.user.id;
    user.accessToken = data.accessToken;

    return user;
  }

  async loginUser(email: string, password: string): Promise<string> {
    const response = await request
      .default(this.app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    // TransformInterceptor가 응답을 감싸므로 data 속성에서 실제 데이터를 가져옴
    return response.body.data.accessToken;
  }

  getAuthHeader(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }
}
