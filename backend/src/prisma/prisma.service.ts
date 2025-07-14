import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Prisma connected to database');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error.message);
      this.logger.warn('⚠️  Server will start without database connection');
      // Don't throw error - allow server to start
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}