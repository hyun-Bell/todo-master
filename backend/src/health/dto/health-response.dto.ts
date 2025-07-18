import { ApiProperty } from '@nestjs/swagger';

export class ServiceStatus {
  @ApiProperty({ description: '서비스 상태', enum: ['up', 'down', 'error'] })
  status: 'up' | 'down' | 'error';

  @ApiProperty({ description: '응답 시간 (ms)', required: false })
  responseTime?: number;

  @ApiProperty({ description: '상태 메시지' })
  message: string;

  @ApiProperty({ description: '추가 메타데이터', required: false })
  metadata?: Record<string, any>;
}

export class ServiceHealthStatus {
  @ApiProperty({ description: '데이터베이스 상태', enum: ['up', 'down'] })
  database: 'up' | 'down';

  @ApiProperty({ description: 'Redis 상태', enum: ['up', 'down'] })
  redis: 'up' | 'down';

  @ApiProperty({ description: 'Supabase 상태', enum: ['up', 'down'] })
  supabase: 'up' | 'down';
}

export class HealthResponseDto {
  @ApiProperty({
    description: '전체 시스템 상태',
    enum: ['healthy', 'unhealthy', 'degraded'],
  })
  status: 'healthy' | 'unhealthy' | 'degraded';

  @ApiProperty({ description: '체크 시간' })
  timestamp: string;

  @ApiProperty({ description: '서비스별 상태' })
  services: ServiceHealthStatus;
}

export class SystemInfo {
  @ApiProperty({ description: '메모리 사용 정보' })
  memory: ServiceStatus;

  @ApiProperty({ description: 'Node.js 버전' })
  nodeVersion: string;

  @ApiProperty({ description: '환경' })
  environment: string;
}

export class DetailedServiceHealthStatus {
  @ApiProperty({ description: '데이터베이스 상태' })
  database: ServiceStatus;

  @ApiProperty({ description: 'Redis 상태' })
  redis: ServiceStatus;

  @ApiProperty({ description: 'Supabase 상태' })
  supabase: ServiceStatus;

  @ApiProperty({ description: 'WebSocket 상태' })
  websocket: ServiceStatus;
}

export class DetailedHealthResponseDto {
  @ApiProperty({
    description: '전체 시스템 상태',
    enum: ['healthy', 'unhealthy', 'degraded'],
  })
  status: 'healthy' | 'unhealthy' | 'degraded';

  @ApiProperty({ description: '체크 시간' })
  timestamp: string;

  @ApiProperty({ description: '시스템 가동 시간 (초)' })
  uptime: number;

  @ApiProperty({ description: '상세 서비스 상태' })
  services: DetailedServiceHealthStatus;

  @ApiProperty({ description: '시스템 정보' })
  system: SystemInfo;
}
