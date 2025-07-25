import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';

import {
  DetailedHealthResponseDto,
  HealthResponseDto,
} from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
    type: HealthResponseDto,
  })
  async checkHealth(): Promise<HealthResponseDto> {
    return this.healthService.checkHealth();
  }

  @Get('detailed')
  @Public()
  @ApiOperation({ summary: 'Detailed health check with all services' })
  @ApiResponse({
    status: 200,
    description: 'Detailed service health status',
    type: DetailedHealthResponseDto,
  })
  async checkDetailedHealth(): Promise<DetailedHealthResponseDto> {
    return this.healthService.checkDetailedHealth();
  }

  @Get('database')
  @Public()
  @ApiOperation({ summary: '데이터베이스 연결 상태 확인' })
  @ApiResponse({
    status: 200,
    description: '데이터베이스 연결이 정상입니다.',
  })
  @ApiResponse({
    status: 503,
    description: '데이터베이스 연결에 문제가 있습니다.',
  })
  async checkDatabase() {
    return this.healthService.checkDatabase();
  }

  @Get('supabase')
  @Public()
  @ApiOperation({ summary: 'Supabase 연결 상태 확인' })
  @ApiResponse({
    status: 200,
    description: 'Supabase 연결이 정상입니다.',
  })
  @ApiResponse({
    status: 503,
    description: 'Supabase 연결에 문제가 있습니다.',
  })
  async checkSupabase() {
    return this.healthService.checkSupabase();
  }
}
