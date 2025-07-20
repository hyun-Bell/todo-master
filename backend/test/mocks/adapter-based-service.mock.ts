/**
 * Adapter 기반 Service Mock
 *
 * IAuthAdapter를 사용하여 SupabaseService를 모킹
 */

import { type IAuthAdapter } from '../adapters/auth-adapter.interface';

export const createAdapterBasedSupabaseServiceMock = (
  adapter: IAuthAdapter,
) => {
  return {
    // Adapter 기반 메서드들
    getClient: jest.fn(() => ({
      auth: {
        signInWithPassword: jest.fn((credentials) =>
          adapter.signIn(credentials),
        ),
        signOut: jest.fn(() => adapter.signOut()),
        getUser: jest.fn(async (token?: string) => {
          if (!token) return { data: { user: null }, error: null };
          const user = await adapter.verifyToken(token);
          return { data: { user }, error: null };
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(async () => ({ data: null, error: null })),
          })),
        })),
        insert: jest.fn(async () => ({ data: null, error: null })),
        update: jest.fn(async () => ({ data: null, error: null })),
        delete: jest.fn(async () => ({ data: null, error: null })),
      })),
    })),

    getAdminClient: jest.fn(() => ({
      auth: {
        admin: {
          createUser: jest.fn((params) =>
            adapter.createUser({
              email: params.email,
              password: params.password,
              fullName: params.user_metadata?.fullName,
              avatarUrl: params.user_metadata?.avatarUrl,
              emailConfirmed: params.email_confirm,
            }),
          ),
          getUserById: jest.fn((id) =>
            adapter.getUserById(id).then((user) => ({
              data: { user },
              error: null,
            })),
          ),
          updateUserById: jest.fn((id, updates) =>
            adapter
              .updateUser(id, {
                email: updates.email,
                fullName: updates.user_metadata?.fullName,
                avatarUrl: updates.user_metadata?.avatarUrl,
              })
              .then((user) => ({
                data: { user },
                error: null,
              })),
          ),
          deleteUser: jest.fn((id) =>
            adapter.deleteUser(id).then((success) => ({
              data: success ? {} : null,
              error: success ? null : { message: 'Failed to delete user' },
            })),
          ),
          listUsers: jest.fn(async () => ({
            data: { users: [] },
            error: null,
          })),
        },
        signInWithPassword: jest.fn((credentials) =>
          adapter.signIn(credentials),
        ),
        signOut: jest.fn(() => adapter.signOut()),
        getUser: jest.fn(async (token?: string) => {
          if (!token) return { data: { user: null }, error: null };
          const user = await adapter.verifyToken(token);
          return { data: { user }, error: null };
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(async () => ({ data: null, error: null })),
          })),
        })),
        insert: jest.fn(async () => ({ data: null, error: null })),
        update: jest.fn(async () => ({ data: null, error: null })),
        delete: jest.fn(async () => ({ data: null, error: null })),
      })),
    })),

    // SupabaseService 핵심 메서드들
    verifyToken: jest.fn((token: string) => adapter.verifyToken(token)),
    getUserById: jest.fn((id: string) => adapter.getUserById(id)),
    getUserByEmail: jest.fn((email: string) => adapter.getUserByEmail(email)),
  };
};
