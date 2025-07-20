import './common';
import { PrismaClient } from '../../generated/prisma';

// Integration 테스트 전용 설정
const prisma = new PrismaClient();

// 테스트 타임아웃 설정
jest.setTimeout(20000);

// 테스트 전 데이터베이스 정리
beforeAll(async () => {
  // 테스트 데이터베이스 연결 확인
  await prisma.$connect();
});

// 각 테스트 전 트랜잭션 시작
beforeEach(async () => {
  // 테이블 순서대로 정리 (외래 키 제약 고려)
  await prisma.$executeRaw`TRUNCATE TABLE notifications, checkpoints, plans, goals, users CASCADE`;
});

// 테스트 후 데이터베이스 연결 종료
afterAll(async () => {
  await prisma.$disconnect();
});
