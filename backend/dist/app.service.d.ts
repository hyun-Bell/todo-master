import { PrismaService } from './prisma/prisma.service';
export declare class AppService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHello(): string;
    getHealthCheck(): Promise<{
        status: string;
        server: string;
        database: string;
        timestamp: string;
        error?: undefined;
        note?: undefined;
    } | {
        status: string;
        server: string;
        database: string;
        error: any;
        timestamp: string;
        note: string;
    }>;
}
