import { Test, type TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
describe('HealthService', () => {
  let service: HealthService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;
  let supabaseService: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);
    supabaseService = module.get(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDatabase', () => {
    it('데이터베이스가 정상일 때 up 상태를 반환해야 함', async () => {
      // Given
      prismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // When
      const result = await service.checkDatabase();

      // Then
      expect(result.status).toBe('up');
      expect(result.message).toBe('PostgreSQL connection is healthy');
      expect(result.responseTime).toBeDefined();
    });

    it('데이터베이스 연결 실패 시 down 상태를 반환해야 함', async () => {
      // Given
      const error = new Error('Connection refused');
      prismaService.$queryRaw.mockRejectedValue(error);

      // When
      const result = await service.checkDatabase();

      // Then
      expect(result.status).toBe('down');
      expect(result.message).toBe(
        'Database connection failed: Connection refused',
      );
    });
  });

  describe('checkSupabase', () => {
    it('Supabase가 정상일 때 up 상태를 반환해야 함', async () => {
      // Given
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ error: null }),
      };
      supabaseService.getClient.mockReturnValue(mockClient as any);

      // When
      const result = await service.checkSupabase();

      // Then
      expect(result.status).toBe('up');
      expect(result.message).toBe('Supabase connection is healthy');
      expect(result.responseTime).toBeDefined();
    });

    it('Supabase 연결 실패 시 down 상태를 반환해야 함', async () => {
      // Given
      const error = new Error('Network error');
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ error }),
      };
      supabaseService.getClient.mockReturnValue(mockClient as any);

      // When
      const result = await service.checkSupabase();

      // Then
      expect(result.status).toBe('down');
      expect(result.message).toBe('Supabase connection failed: Network error');
    });

    it('SupabaseService가 없을 때 down 상태를 반환해야 함', async () => {
      // Given
      const moduleWithoutSupabase: TestingModule =
        await Test.createTestingModule({
          providers: [
            HealthService,
            {
              provide: PrismaService,
              useValue: { $queryRaw: jest.fn() },
            },
            {
              provide: ConfigService,
              useValue: { get: jest.fn() },
            },
          ],
        }).compile();

      const serviceWithoutSupabase =
        moduleWithoutSupabase.get<HealthService>(HealthService);

      // When
      const result = await serviceWithoutSupabase.checkSupabase();

      // Then
      expect(result.status).toBe('down');
      expect(result.message).toBe('Supabase service not configured');
    });
  });

  describe('checkHealth', () => {
    it('모든 서비스가 정상일 때 healthy 상태를 반환해야 함', async () => {
      // Given
      prismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ error: null }),
      };
      supabaseService.getClient.mockReturnValue(mockClient as any);

      // Redis 모킹 추가
      jest.spyOn(service as any, 'checkRedis').mockResolvedValue(true);

      // When
      const result = await service.checkHealth();

      // Then
      expect(result.status).toBe('ok');
      expect(result.services.database).toBe('up');
      expect(result.services.supabase).toBe('up');
      expect(result.services.redis).toBe('up');
      expect(result.timestamp).toBeDefined();
    });

    it('일부 서비스가 실패할 때 unhealthy 상태를 반환해야 함', async () => {
      // Given
      prismaService.$queryRaw.mockRejectedValue(new Error('DB Error'));
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ error: null }),
      };
      supabaseService.getClient.mockReturnValue(mockClient as any);

      // Redis 모킹 추가
      jest.spyOn(service as any, 'checkRedis').mockResolvedValue(false);

      // When
      const result = await service.checkHealth();

      // Then
      expect(result.status).toBe('unhealthy');
      expect(result.services.database).toBe('down');
      expect(result.services.supabase).toBe('up');
      expect(result.services.redis).toBe('down');
    });
  });
});
