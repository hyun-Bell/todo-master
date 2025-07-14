import { OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';
export declare class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly logger;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
