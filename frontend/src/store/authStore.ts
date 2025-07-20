import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '@services/api.service';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.login(email, password);
          
          if (response.error) {
            throw new Error(response.error);
          }

          if (response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (error: any) {
          set({
            error: error.message || '로그인에 실패했습니다.',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (email: string, password: string, fullName: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.register(email, password, fullName);
          
          if (response.error) {
            throw new Error(response.error);
          }

          if (response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (error: any) {
          set({
            error: error.message || '회원가입에 실패했습니다.',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await apiService.logout();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || '로그아웃에 실패했습니다.',
            isLoading: false,
          });
          throw error;
        }
      },

      refreshSession: async () => {
        try {
          const response = await apiService.refreshToken();
          
          if (response.data) {
            // 새 토큰으로 프로필 정보 다시 가져오기
            const profileResponse = await apiService.getProfile();
            if (profileResponse.data) {
              set({
                user: profileResponse.data,
                isAuthenticated: true,
              });
            }
          } else {
            // 토큰 갱신 실패 시 로그아웃 처리
            set({
              user: null,
              isAuthenticated: false,
            });
          }
        } catch (error) {
          // 토큰 갱신 실패 시 로그아웃 처리
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      checkAuthStatus: async () => {
        set({ isLoading: true });
        try {
          const accessToken = await AsyncStorage.getItem('accessToken');
          
          if (!accessToken) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          // 프로필 정보 가져오기
          const response = await apiService.getProfile();
          
          if (response.data) {
            set({
              user: response.data,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // 토큰이 유효하지 않으면 갱신 시도
            await get().refreshSession();
            set({ isLoading: false });
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);