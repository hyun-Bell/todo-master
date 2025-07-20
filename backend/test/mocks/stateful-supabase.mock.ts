/**
 * Stateful Supabase Mock
 *
 * 실제 비즈니스 로직을 반영하는 지능형 모킹 시스템
 * - 메모리 기반 사용자 저장소
 * - 실제 중복 검사 로직
 * - 비밀번호 검증
 * - 세션 관리
 */

import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { type User } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

interface StoredUser {
  id: string;
  email: string;
  password?: string;
  fullName?: string;
  avatarUrl?: string;
  emailConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

interface Session {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export class StatefulSupabaseMock {
  private users = new Map<string, StoredUser>();
  private sessions = new Map<string, Session>();
  private emailToId = new Map<string, string>();

  constructor() {
    this.reset();
  }

  /**
   * 상태 초기화
   */
  reset() {
    this.users.clear();
    this.sessions.clear();
    this.emailToId.clear();
  }

  /**
   * Admin 클라이언트 모킹
   */
  getAdminClient() {
    return {
      auth: {
        admin: {
          createUser: this.createUser.bind(this),
          getUserById: this.getUserById.bind(this),
          updateUserById: this.updateUserById.bind(this),
          deleteUser: this.deleteUser.bind(this),
          listUsers: this.listUsers.bind(this),
        },
        getUser: this.getAuthUser.bind(this),
        signInWithPassword: this.signInWithPassword.bind(this),
        signOut: this.signOut.bind(this),
      },
      from: (table: string) => this.getTableMock(table),
    };
  }

  /**
   * 일반 클라이언트 모킹
   */
  getClient() {
    return this.getAdminClient();
  }

  /**
   * 사용자 생성 (실제 비즈니스 로직 반영)
   */
  private async createUser(params: {
    email: string;
    password?: string;
    email_confirm?: boolean;
    user_metadata?: any;
  }) {
    const {
      email,
      password,
      email_confirm = false,
      user_metadata = {},
    } = params;

    // 이메일 유효성 검사
    if (!this.isValidEmail(email)) {
      return {
        data: null,
        error: { message: 'Invalid email format', status: 400 },
      };
    }

    // 중복 이메일 검사
    if (this.emailToId.has(email)) {
      return {
        data: null,
        error: { message: 'User already registered', status: 400 },
      };
    }

    // 비밀번호 검증 (제공된 경우)
    if (password && !this.isValidPassword(password)) {
      return {
        data: null,
        error: { message: 'Password does not meet requirements', status: 400 },
      };
    }

    // 사용자 생성
    const userId = uuid();
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;

    const user: StoredUser = {
      id: userId,
      email,
      password: hashedPassword,
      fullName: user_metadata.fullName || user_metadata.name || '',
      avatarUrl: user_metadata.avatarUrl || user_metadata.avatar_url || null,
      emailConfirmed: email_confirm,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: user_metadata,
    };

    this.users.set(userId, user);
    this.emailToId.set(email, userId);

    return {
      data: {
        user: this.toSupabaseUser(user),
      },
      error: null,
    };
  }

  /**
   * ID로 사용자 조회
   */
  private async getUserById(id: string) {
    const user = this.users.get(id);
    if (!user) {
      return {
        data: null,
        error: { message: 'User not found', status: 404 },
      };
    }

    return {
      data: {
        user: this.toSupabaseUser(user),
      },
      error: null,
    };
  }

  /**
   * 이메일로 사용자 조회 (내부 헬퍼)
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const userId = this.emailToId.get(email);
    if (!userId) return null;

    const user = this.users.get(userId);
    return user ? this.toSupabaseUser(user) : null;
  }

  /**
   * 사용자 업데이트
   */
  private async updateUserById(id: string, updates: any) {
    const user = this.users.get(id);
    if (!user) {
      return {
        data: null,
        error: { message: 'User not found', status: 404 },
      };
    }

    // 이메일 변경 시 중복 검사
    if (updates.email && updates.email !== user.email) {
      if (this.emailToId.has(updates.email)) {
        return {
          data: null,
          error: { message: 'Email already in use', status: 400 },
        };
      }
      // 이메일 인덱스 업데이트
      this.emailToId.delete(user.email);
      this.emailToId.set(updates.email, id);
    }

    // 사용자 정보 업데이트
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updatedUser);

    return {
      data: {
        user: this.toSupabaseUser(updatedUser),
      },
      error: null,
    };
  }

  /**
   * 사용자 삭제
   */
  private async deleteUser(id: string) {
    const user = this.users.get(id);
    if (!user) {
      return {
        data: null,
        error: { message: 'User not found', status: 404 },
      };
    }

    this.users.delete(id);
    this.emailToId.delete(user.email);

    // 관련 세션 삭제
    for (const [token, session] of this.sessions.entries()) {
      if (session.user.id === id) {
        this.sessions.delete(token);
      }
    }

    return {
      data: {},
      error: null,
    };
  }

  /**
   * 사용자 목록 조회
   */
  private async listUsers() {
    const users = Array.from(this.users.values()).map((user) =>
      this.toSupabaseUser(user),
    );

    return {
      data: {
        users,
      },
      error: null,
    };
  }

  /**
   * 로그인
   */
  private async signInWithPassword(credentials: {
    email: string;
    password: string;
  }) {
    const { email, password } = credentials;

    const userId = this.emailToId.get(email);
    if (!userId) {
      return {
        data: null,
        error: { message: 'Invalid login credentials', status: 400 },
      };
    }

    const user = this.users.get(userId);
    if (!user?.password) {
      return {
        data: null,
        error: { message: 'Invalid login credentials', status: 400 },
      };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return {
        data: null,
        error: { message: 'Invalid login credentials', status: 400 },
      };
    }

    // 세션 생성
    const session = this.createSession(user);

    return {
      data: {
        user: this.toSupabaseUser(user),
        session,
      },
      error: null,
    };
  }

  /**
   * 로그아웃
   */
  private async signOut() {
    // 실제 구현에서는 토큰을 받아서 해당 세션을 삭제해야 함
    return {
      error: null,
    };
  }

  /**
   * 현재 사용자 조회
   */
  private async getAuthUser(token?: string) {
    if (!token) {
      return {
        data: { user: null },
        error: null,
      };
    }

    const session = this.sessions.get(token);
    if (!session || session.expires_at < Date.now()) {
      return {
        data: { user: null },
        error: null,
      };
    }

    return {
      data: { user: session.user },
      error: null,
    };
  }

  /**
   * 토큰 검증
   */
  async verifyToken(token: string): Promise<User | null> {
    const result = await this.getAuthUser(token);
    return result.data?.user || null;
  }

  /**
   * 테이블 모킹
   */
  private getTableMock(table: string) {
    // 간단한 테이블 모킹 (필요시 확장)
    return {
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }),
      delete: async () => ({ data: null, error: null }),
    };
  }

  /**
   * 내부 사용자를 Supabase User 형식으로 변환
   */
  private toSupabaseUser(user: StoredUser): User {
    return {
      id: user.id,
      email: user.email,
      app_metadata: {},
      user_metadata: {
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        ...user.metadata,
      },
      aud: 'authenticated',
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
      email_confirmed_at: user.emailConfirmed
        ? user.createdAt.toISOString()
        : null,
      phone: undefined,
      confirmed_at: user.emailConfirmed ? user.createdAt.toISOString() : null,
      last_sign_in_at: undefined,
      role: 'authenticated',
    } as User;
  }

  /**
   * 세션 생성
   */
  private createSession(user: StoredUser): Session {
    const token = `mock-token-${uuid()}`;
    const session: Session = {
      user: this.toSupabaseUser(user),
      access_token: token,
      refresh_token: `mock-refresh-${uuid()}`,
      expires_at: Date.now() + 3600 * 1000, // 1시간
    };

    this.sessions.set(token, session);
    return session;
  }

  /**
   * 이메일 유효성 검사
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 비밀번호 유효성 검사
   */
  private isValidPassword(password: string): boolean {
    // 테스트 환경에서는 느슨한 검증
    return password.length >= 6;
  }

  /**
   * 디버깅용: 현재 상태 조회
   */
  getState() {
    return {
      users: Array.from(this.users.values()),
      sessions: Array.from(this.sessions.entries()),
      emailIndex: Array.from(this.emailToId.entries()),
    };
  }
}
