import { type PrismaClient } from '../generated/prisma';
import { type SupabaseService } from '../src/supabase/supabase.service';

/**
 * 테스트 데이터베이스 정리 유틸리티
 */
export class DatabaseCleaner {
  private prisma: PrismaClient;
  private supabaseService?: SupabaseService;

  constructor(prisma: PrismaClient, supabaseService?: SupabaseService) {
    this.prisma = prisma;
    this.supabaseService = supabaseService;
  }

  /**
   * 모든 테이블 데이터 정리 (Foreign Key 제약조건 고려한 순서)
   */
  async cleanDatabase(): Promise<void> {
    try {
      // Foreign Key 제약조건을 고려한 삭제 순서
      // 1. 가장 깊은 자식 테이블부터 삭제
      // 2. 점진적으로 부모 테이블로 이동

      const isSilent =
        process.env.TEST_SILENT === 'true' || process.env.CI === 'true';

      if (!isSilent) {
        console.log('🗑️  데이터베이스 정리 시작...');
      }

      // 1. Checkpoints (Plan 참조) - 가장 깊은 자식 테이블
      await this.prisma.checkpoint.deleteMany();
      if (!isSilent) console.log('  ✅ Checkpoints 정리 완료');

      // 2. Plans (Goal 참조)
      await this.prisma.plan.deleteMany();
      if (!isSilent) console.log('  ✅ Plans 정리 완료');

      // 3. Notifications (User 참조)
      await this.prisma.notification.deleteMany();
      if (!isSilent) console.log('  ✅ Notifications 정리 완료');

      // 4. Goals (User 참조)
      await this.prisma.goal.deleteMany();
      if (!isSilent) console.log('  ✅ Goals 정리 완료');

      // 5. Supabase Auth 사용자 정리 (Users 삭제 전에 실행)
      if (this.supabaseService) {
        await this.cleanSupabaseUsers();
        if (!isSilent) console.log('  ✅ Supabase Auth 사용자 정리 완료');
      }

      // 6. Users (최상위 부모 테이블)
      await this.prisma.user.deleteMany();
      if (!isSilent) console.log('  ✅ Users 정리 완료');

      if (!isSilent) {
        console.log('🗑️  데이터베이스 정리 완료');
      }
    } catch (error) {
      console.error('❌ 데이터베이스 정리 실패:', error.message);
      throw error;
    }
  }

  /**
   * 특정 테이블만 정리
   */
  async cleanTable(tableName: string): Promise<void> {
    try {
      switch (tableName) {
        case 'checkpoints':
          await this.prisma.checkpoint.deleteMany();
          break;
        case 'plans':
          await this.prisma.plan.deleteMany();
          break;
        case 'notifications':
          await this.prisma.notification.deleteMany();
          break;
        case 'goals':
          await this.prisma.goal.deleteMany();
          break;
        case 'users':
          await this.prisma.user.deleteMany();
          break;
        default:
          throw new Error(`알 수 없는 테이블명: ${tableName}`);
      }

      const isSilent =
        process.env.TEST_SILENT === 'true' || process.env.CI === 'true';
      if (!isSilent) {
        console.log(`🗑️  ${tableName} 테이블 정리 완료`);
      }
    } catch (error) {
      console.error(`❌ ${tableName} 테이블 정리 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 트랜잭션 기반 데이터 정리 (롤백 가능)
   */
  async cleanDatabaseInTransaction(): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Foreign Key 제약조건 순서대로 정리
      await tx.checkpoint.deleteMany();
      await tx.plan.deleteMany();
      await tx.notification.deleteMany();
      await tx.goal.deleteMany();
      await tx.user.deleteMany();
    });

    const isSilent =
      process.env.TEST_SILENT === 'true' || process.env.CI === 'true';
    if (!isSilent) {
      console.log('🗑️  트랜잭션 기반 데이터베이스 정리 완료');
    }
  }

  /**
   * 데이터베이스 상태 확인
   */
  async getDatabaseStatus(): Promise<{
    users: number;
    goals: number;
    plans: number;
    checkpoints: number;
    notifications: number;
  }> {
    const [users, goals, plans, checkpoints, notifications] = await Promise.all(
      [
        this.prisma.user.count(),
        this.prisma.goal.count(),
        this.prisma.plan.count(),
        this.prisma.checkpoint.count(),
        this.prisma.notification.count(),
      ],
    );

    return { users, goals, plans, checkpoints, notifications };
  }

  /**
   * Supabase Auth 사용자 정리
   */
  async cleanSupabaseUsers(): Promise<void> {
    if (!this.supabaseService) {
      return;
    }

    try {
      // supabaseId가 있는 모든 사용자 조회
      const users = await this.prisma.user.findMany({
        where: {
          supabaseId: {
            not: null,
          },
        },
        select: {
          id: true,
          email: true,
          supabaseId: true,
        },
      });

      const isSilent =
        process.env.TEST_SILENT === 'true' || process.env.CI === 'true';

      // 각 사용자를 Supabase에서 삭제
      for (const user of users) {
        if (user.supabaseId) {
          const deleted = await this.supabaseService.deleteUser(
            user.supabaseId,
          );
          if (!isSilent && deleted) {
            console.log(`    🗑️  Supabase 사용자 삭제: ${user.email}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Supabase 사용자 정리 실패:', error.message);
      // Supabase 정리 실패는 경고만 하고 계속 진행
    }
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
