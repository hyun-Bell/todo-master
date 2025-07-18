import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import {
  DetailedHealthResponseDto,
  HealthResponseDto,
} from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
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
  @ApiOperation({ summary: 'Detailed health check with all services' })
  @ApiResponse({
    status: 200,
    description: 'Detailed service health status',
    type: DetailedHealthResponseDto,
  })
  async checkDetailedHealth(): Promise<DetailedHealthResponseDto> {
    return this.healthService.checkDetailedHealth();
  }
}
