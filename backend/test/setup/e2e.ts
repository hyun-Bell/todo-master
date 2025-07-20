import './common';
import { PrismaClient } from '../../generated/prisma';

// E2E 테스트 전용 설정
const prisma = new PrismaClient();

// 테스트 타임아웃 설정
jest.setTimeout(30000);

// 테스트 전 설정
beforeAll(async () => {
  // 데이터베이스 연결
  await prisma.$connect();

  // 데이터베이스 초기화 - 역순으로 삭제하여 외래 키 제약 조건 준수
  try {
    await prisma.checkpoint.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.error('Error cleaning database:', error);
  }
});

// 각 테스트 스위트 간 데이터 정리
// user-flow 테스트는 여러 단계가 연속적으로 실행되므로 afterEach에서 정리하면 안 됨
afterEach(async () => {
  // 현재 실행 중인 테스트 파일 경로 확인
  const currentTestFile = expect.getState().testPath;

  // user-flow 테스트가 아닌 경우에만 데이터 정리
  if (!currentTestFile?.includes('user-flow')) {
    // 데이터베이스 정리 - 테스트 간 격리 보장
    try {
      await prisma.checkpoint.deleteMany();
      await prisma.plan.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.goal.deleteMany();
      // users 테이블은 각 테스트에서 필요에 따라 관리
    } catch (error) {
      console.error('Error cleaning database after test:', error);
    }
  }
});

// 모든 테스트 후 정리
afterAll(async () => {
  // 최종 데이터베이스 정리
  try {
    await prisma.checkpoint.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.error('Error in final cleanup:', error);
  }

  // 데이터베이스 연결 종료
  await prisma.$disconnect();
});
