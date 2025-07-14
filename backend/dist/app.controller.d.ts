import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
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
