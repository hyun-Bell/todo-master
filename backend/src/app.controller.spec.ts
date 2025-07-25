import { Test, type TestingModule } from '@nestjs/testing';

import { createMockPrismaService } from '../test/utils/mock-prisma';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController 앱 컨트롤러', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: createMockPrismaService(),
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root 루트 엔드포인트', () => {
    it('TodoMaster Backend API 메시지를 반환해야 함', () => {
      expect(appController.getHello()).toBe(
        'TodoMaster Backend API is running! 🚀',
      );
    });
  });
});
