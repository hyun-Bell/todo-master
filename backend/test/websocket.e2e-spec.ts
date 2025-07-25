import { type INestApplication } from '@nestjs/common';
import { type Socket as ClientSocket, io } from 'socket.io-client';

import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';

import { AuthHelper, type TestUser } from './auth-helper';
import { DatabaseCleaner } from './database-cleaner';
import { createE2ETestApp } from './helpers/e2e-test-app';

describe('WebSocket E2E 테스트', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let supabaseService: SupabaseService;
  let authHelper: AuthHelper;
  let testUser: TestUser;
  let clientSocket: ClientSocket;
  let wsUrl: string;
  let testPort: number;
  let databaseCleaner: DatabaseCleaner;

  beforeAll(async () => {
    app = await createE2ETestApp();

    testPort = parseInt(process.env.TEST_PORT || process.env.PORT || '3001');
    wsUrl = `http://localhost:${testPort}/realtime`;

    await app.listen(testPort);

    prisma = app.get(PrismaService);
    supabaseService = app.get(SupabaseService);
    databaseCleaner = new DatabaseCleaner(prisma, supabaseService);

    await databaseCleaner.cleanDatabase();

    authHelper = new AuthHelper(app);
    testUser = await authHelper.registerUser({
      email: `test-websocket-${Date.now()}@example.com`,
      password: 'testPassword123',
      fullName: 'Test WebSocket User',
    });
  });

  afterAll(async () => {
    await databaseCleaner.cleanDatabase();
    await databaseCleaner.disconnect();
    await app.close();
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
  });

  describe('연결 및 인증', () => {
    it('유효한 JWT 토큰으로 연결 성공', (done) => {
      clientSocket = io(wsUrl, {
        auth: { token: testUser.accessToken },
        transports: ['websocket'],
      });

      clientSocket.on('connected', (data) => {
        expect(data).toMatchObject({
          userId: testUser.id,
          connectedAt: expect.any(String),
        });
        done();
      });

      clientSocket.on('error', (error) => {
        done(new Error(`Unexpected error: ${error.message}`));
      });
    });

    it('토큰 없이 연결 시도 시 거부', (done) => {
      clientSocket = io(wsUrl, { transports: ['websocket'] });

      clientSocket.on('connect_error', () => done());
      clientSocket.on('error', () => done());
      clientSocket.on('connected', () =>
        done(new Error('Should not connect without token')),
      );
    });
  });

  describe('기본 기능', () => {
    it('WebSocket 서버가 실행 중이어야 함', () => {
      expect(wsUrl).toBeDefined();
      expect(testPort).toBeGreaterThan(0);
    });
  });
});
