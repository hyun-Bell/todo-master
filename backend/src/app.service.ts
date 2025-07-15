import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'TodoMaster Backend API is running! 🚀';
  }

  async getHealthCheck() {
    try {
      // Simple database connection test
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        server: 'running',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'warning',
        server: 'running',
        database: 'disconnected',
        error:
          error instanceof Error ? error.message : 'Database connection failed',
        timestamp: new Date().toISOString(),
        note: 'Server is running but database is not connected. Please check DATABASE_URL in .env file.',
      };
    }
  }
}
