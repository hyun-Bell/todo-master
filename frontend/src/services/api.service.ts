import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@constants/config';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_URL}/api/v1`;
  }

  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('accessToken');
  }

  private async setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
  }

  private async clearAuthTokens(): Promise<void> {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAuthToken();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.message || 'API 요청 실패',
        };
      }

      return { data };
    } catch (error) {
      console.error('API 요청 에러:', error);
      return {
        error: error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.',
      };
    }
  }

  // 인증 관련 API
  async register(email: string, password: string, fullName: string) {
    const response = await this.request<{
      user: { id: string; email: string; fullName: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });

    if (response.data) {
      await this.setAuthTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<{
      user: { id: string; email: string; fullName: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data) {
      await this.setAuthTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response;
  }

  async logout() {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    await this.clearAuthTokens();
    return response;
  }

  async getProfile() {
    return await this.request<{
      id: string;
      email: string;
      fullName: string;
      createdAt: string;
      updatedAt: string;
    }>('/auth/profile', {
      method: 'GET',
    });
  }

  async refreshToken() {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) {
      return { error: '리프레시 토큰이 없습니다.' };
    }

    const response = await this.request<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (response.data) {
      await this.setAuthTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response;
  }

  // 목표 관련 API
  async getGoals() {
    return await this.request<any[]>('/goals');
  }

  async createGoal(goalData: any) {
    return await this.request('/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  }

  async updateGoal(id: string, goalData: any) {
    return await this.request(`/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(goalData),
    });
  }

  async deleteGoal(id: string) {
    return await this.request(`/goals/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();