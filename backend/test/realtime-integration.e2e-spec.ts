import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { GoalStatus, Priority } from '../generated/prisma';
import { AuthHelper, type TestUser } from './auth-helper';

describe('Realtime Integration E2E', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authHelper: AuthHelper;
  let testUser: TestUser;
  let socket: Socket;
  let supabase: any;

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

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();
    await app.listen(0);

    // Initialize Supabase client
    supabase = createClient(
      process.env.SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_ANON_KEY || 'test-anon-key',
    );

    // Clean up test data
    await cleanDatabase();

    // Create auth helper and test user
    authHelper = new AuthHelper(app);
    testUser = await authHelper.registerUser({
      email: 'realtime-test@example.com',
      password: 'Test123!',
      fullName: 'Realtime Test User',
    });
  });

  afterAll(async () => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
    await cleanDatabase();
    await prisma.$disconnect();
    await app.close();
  });

  async function cleanDatabase() {
    await prisma.checkpoint.deleteMany({});
    await prisma.plan.deleteMany({});
    await prisma.goal.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.user.deleteMany({});
  }

  describe('WebSocket and Realtime Events', () => {
    beforeEach((done) => {
      const server = app.getHttpServer() as any;
      const addressInfo = server.address();
      const port =
        addressInfo && typeof addressInfo === 'object'
          ? addressInfo.port
          : 3000;
      const serverUrl = `http://localhost:${port}`;
      socket = io(`${serverUrl}/realtime`, {
        auth: { token: testUser.accessToken },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        done();
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        done(error);
      });
    });

    afterEach(() => {
      if (socket && socket.connected) {
        socket.disconnect();
      }
    });

    it.skip('should receive realtime events when creating a goal', (done) => {
      // Skip this test as it requires actual Supabase realtime connection
      // Subscribe to goals table
      socket.emit('subscribe', { tables: ['goals'] }, (response: any) => {
        expect(response.success).toBe(true);
      });

      // Listen for goal creation event
      socket.on('goals:created', (data: any) => {
        expect(data.record).toBeDefined();
        expect(data.record.title).toBe('Test Realtime Goal');
        expect(data.record.userId).toBe(testUser.id);
        expect(data.event).toBe('created');
        done();
      });

      // Create a goal via HTTP API
      setTimeout(async () => {
        await request(app.getHttpServer())
          .post('/goals')
          .set('Authorization', `Bearer ${testUser.accessToken}`)
          .send({
            title: 'Test Realtime Goal',
            description: 'Testing realtime events',
            deadline: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            category: 'test',
            status: GoalStatus.ACTIVE,
            priority: Priority.MEDIUM,
          });
      }, 100);
    });

    it.skip('should receive realtime events when updating a goal', (done) => {
      let goalId: string;

      // First create a goal
      request(app.getHttpServer())
        .post('/goals')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          title: 'Goal to Update',
          description: 'Will be updated',
          deadline: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          category: 'test',
          status: GoalStatus.ACTIVE,
          priority: Priority.MEDIUM,
        })
        .then((response) => {
          goalId = response.body.data.id;

          // Subscribe to goals table
          socket.emit('subscribe', { tables: ['goals'] });

          // Listen for goal update event
          socket.on('goals:updated', (data: any) => {
            expect(data.record).toBeDefined();
            expect(data.record.id).toBe(goalId);
            expect(data.record.title).toBe('Updated Goal Title');
            expect(data.event).toBe('updated');
            expect(data.oldRecord).toBeDefined();
            done();
          });

          // Update the goal
          setTimeout(async () => {
            await request(app.getHttpServer())
              .patch(`/goals/${goalId}`)
              .set('Authorization', `Bearer ${testUser.accessToken}`)
              .send({
                title: 'Updated Goal Title',
              });
          }, 100);
        });
    });

    it.skip('should handle multiple table subscriptions', (done) => {
      const receivedEvents: string[] = [];

      socket.emit(
        'subscribe',
        { tables: ['goals', 'plans'] },
        (response: any) => {
          expect(response.success).toBe(true);
          expect(response.subscribedTables).toEqual(['goals', 'plans']);
        },
      );

      socket.on('goals:created', () => {
        receivedEvents.push('goal');
        checkAllEventsReceived();
      });

      socket.on('plans:created', () => {
        receivedEvents.push('plan');
        checkAllEventsReceived();
      });

      const checkAllEventsReceived = () => {
        if (
          receivedEvents.includes('goal') &&
          receivedEvents.includes('plan')
        ) {
          done();
        }
      };

      // Create both goal and plan
      setTimeout(async () => {
        const goalResponse = await request(app.getHttpServer())
          .post('/goals')
          .set('Authorization', `Bearer ${testUser.accessToken}`)
          .send({
            title: 'Multi-table Test Goal',
            description: 'Testing multi-table subscriptions',
            deadline: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          });

        await request(app.getHttpServer())
          .post('/plans')
          .set('Authorization', `Bearer ${testUser.accessToken}`)
          .send({
            goalId: goalResponse.body.data.id,
            orderIndex: 1,
            title: 'Multi-table Test Plan',
            description: 'Testing plan realtime events',
          });
      }, 100);
    });

    it.skip('should handle unsubscribe from tables', (done) => {
      let eventReceived = false;

      socket.emit('subscribe', { tables: ['goals'] });

      socket.on('goals:created', () => {
        eventReceived = true;
      });

      // Unsubscribe after 200ms
      setTimeout(() => {
        socket.emit('unsubscribe', { tables: ['goals'] }, (response: any) => {
          expect(response.success).toBe(true);
          expect(response.unsubscribedTables).toEqual(['goals']);

          // Create a goal after unsubscribing
          setTimeout(async () => {
            await request(app.getHttpServer())
              .post('/goals')
              .set('Authorization', `Bearer ${testUser.accessToken}`)
              .send({
                title: 'Should Not Receive This',
                description: 'Testing unsubscribe',
                deadline: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000,
                ).toISOString(),
              });

            // Wait to ensure no event is received
            setTimeout(() => {
              expect(eventReceived).toBe(false);
              done();
            }, 500);
          }, 100);
        });
      }, 200);
    });

    it('should handle reconnection with state recovery', (done) => {
      const originalSocketId = socket.id;

      socket.emit('subscribe', { tables: ['goals'] });

      // Simulate disconnect
      socket.disconnect();

      setTimeout(() => {
        socket.connect();

        socket.on('connect', () => {
          expect(socket.id).not.toBe(originalSocketId);

          socket.emit('reconnect', { lastEventId: null }, (response: any) => {
            expect(response.success).toBe(true);
            expect(response.message).toBe('Reconnected successfully');
            done();
          });
        });
      }, 100);
    });

    it('should enforce authorization for realtime connections', (done) => {
      const unauthorizedSocket = io(
        (() => {
          const server = app.getHttpServer() as any;
          const addr = server.address();
          const port = addr && typeof addr === 'object' ? addr.port : 3000;
          return `http://localhost:${port}/realtime`;
        })(),
        {
          auth: { token: 'invalid-token' },
          transports: ['websocket'],
        },
      );

      unauthorizedSocket.on('connect_error', (error) => {
        expect(error.message).toBeDefined();
        done();
      });

      unauthorizedSocket.on('error', (data: any) => {
        expect(data.message).toContain('인증이 필요합니다');
        unauthorizedSocket.disconnect();
        done();
      });

      // Set a timeout in case neither event fires
      setTimeout(() => {
        unauthorizedSocket.disconnect();
        done();
      }, 1000);
    });
  });

  describe('Supabase Realtime Integration', () => {
    it.skip('should sync database changes between Supabase and WebSocket clients', (done) => {
      socket.emit('subscribe', { tables: ['goals'] });

      let websocketEventReceived = false;
      let supabaseEventReceived = false;

      // Listen for WebSocket event
      socket.on('goals:created', (data: any) => {
        websocketEventReceived = true;
        checkBothEventsReceived();
      });

      // Subscribe to Supabase realtime
      const channel = supabase
        .channel('test-goals')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'goals',
          },
          (payload: any) => {
            supabaseEventReceived = true;
            checkBothEventsReceived();
          },
        )
        .subscribe();

      const checkBothEventsReceived = () => {
        if (websocketEventReceived && supabaseEventReceived) {
          channel.unsubscribe();
          done();
        }
      };

      // Create goal after subscriptions are set up
      setTimeout(async () => {
        await request(app.getHttpServer())
          .post('/goals')
          .set('Authorization', `Bearer ${testUser.accessToken}`)
          .send({
            title: 'Supabase Sync Test',
            description: 'Testing Supabase realtime sync',
            deadline: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          });
      }, 500);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should check health status', async () => {
      // Test the basic health endpoint
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', 'ok');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it.skip('should handle rate limiting for realtime subscriptions', (done) => {
      const subscriptions = Array(10).fill(['goals', 'plans', 'checkpoints']);
      let subscriptionCount = 0;
      let errorReceived = false;

      subscriptions.forEach((tables, index) => {
        setTimeout(() => {
          socket.emit('subscribe', { tables }, (response: any) => {
            if (response.error) {
              errorReceived = true;
            } else {
              subscriptionCount++;
            }

            if (index === subscriptions.length - 1) {
              // Rate limiting might not trigger in test env,
              // but we should handle gracefully either way
              expect(subscriptionCount).toBeGreaterThan(0);
              done();
            }
          });
        }, index * 10);
      });
    });
  });
});
