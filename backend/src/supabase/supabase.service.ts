import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabaseClient: SupabaseClient;
  private supabaseAdminClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error(
        'Supabase configuration is missing. Please check your environment variables.',
      );
    }

    // Node.js v24 네이티브 fetch 사용 설정
    const customFetch = (...args: Parameters<typeof fetch>) => fetch(...args);

    // 일반 클라이언트 (Public Anon Key 사용)
    this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: customFetch,
      },
    });

    // 관리자 클라이언트 (Service Role Key 사용)
    this.supabaseAdminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        global: {
          fetch: customFetch,
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );

    this.logger.log('Supabase clients initialized');
  }

  /**
   * 일반 클라이언트 반환 (프론트엔드와 동일한 권한)
   */
  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  /**
   * 관리자 클라이언트 반환 (백엔드 전용, 모든 권한)
   */
  getAdminClient(): SupabaseClient {
    return this.supabaseAdminClient;
  }

  /**
   * Supabase 토큰 검증
   */
  async verifyToken(token: string) {
    try {
      const {
        data: { user },
        error,
      } = await this.supabaseAdminClient.auth.getUser(token);

      if (error || !user) {
        this.logger.error('Token verification failed', error?.message);
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error('Token verification error', error);
      return null;
    }
  }

  /**
   * Supabase 사용자 ID로 사용자 정보 조회
   */
  async getUserById(userId: string) {
    try {
      const { data, error } =
        await this.supabaseAdminClient.auth.admin.getUserById(userId);

      if (error) {
        this.logger.error('Get user by ID failed', error.message);
        return null;
      }

      return data.user;
    } catch (error) {
      this.logger.error('Get user by ID error', error);
      return null;
    }
  }

  /**
   * 이메일로 사용자 조회
   */
  async getUserByEmail(email: string) {
    try {
      const { data, error } = await this.supabaseAdminClient
        .from('auth.users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        this.logger.error('Get user by email failed', error.message);
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error('Get user by email error', error);
      return null;
    }
  }

  /**
   * Supabase 사용자 삭제 (테스트 환경 정리용)
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      const { error } =
        await this.supabaseAdminClient.auth.admin.deleteUser(userId);

      if (error) {
        this.logger.error('Delete user failed', error.message);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Delete user error', error);
      return false;
    }
  }
}
