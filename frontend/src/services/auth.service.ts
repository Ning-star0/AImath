import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  LoginPayload,
  LoginResult,
  RegisterPayload,
  RegisterResult,
  UpdateStudentProfilePayload,
} from '@/types/api';

export const authService = {
  async login(payload: LoginPayload) {
    const response = await apiClient.post<ApiResponse<LoginResult>>(
      '/auth/login',
      payload,
    );

    return response.data.data;
  },

  async register(payload: RegisterPayload) {
    const response = await apiClient.post<ApiResponse<RegisterResult>>(
      '/auth/register',
      payload,
    );

    return response.data.data;
  },

  async getCurrentUser() {
    const response = await apiClient.get<ApiResponse<LoginResult['user']>>(
      '/auth/me',
    );
    return response.data.data;
  },

  async updateStudentProfile(payload: UpdateStudentProfilePayload) {
    const response = await apiClient.patch<ApiResponse<LoginResult['user']>>(
      '/auth/me/student-profile',
      payload,
    );
    return response.data.data;
  },
};
