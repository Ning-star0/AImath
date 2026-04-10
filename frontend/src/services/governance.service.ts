import { apiClient } from '@/lib/api';
import type { ApiResponse, UserRole } from '@/types/api';

export interface CreatePilotFeedbackPayload {
  role?: UserRole;
  contactName?: string;
  contactPhone?: string;
  schoolName?: string;
  studentGrade?: number;
  rating?: number;
  feedbackType?: string;
  content: string;
  tags?: string[];
}

export interface PilotFeedbackListResult {
  total: number;
  list: Array<{
    id: string;
    role?: UserRole | null;
    feedbackType: string;
    contactName?: string | null;
    schoolName?: string | null;
    studentGrade?: number | null;
    rating?: number | null;
    content: string;
    tags: string[];
    createdAt: string;
    user?: {
      id: string;
      displayName: string;
      role: UserRole;
    } | null;
  }>;
}

export interface SystemLogListResult {
  total: number;
  list: Array<{
    id: string;
    module: string;
    action: string;
    level: string;
    targetType?: string | null;
    targetId?: string | null;
    message: string;
    createdAt: string;
    actor?: {
      id: string;
      displayName: string;
      role: UserRole;
    } | null;
  }>;
}

export const governanceService = {
  async createPilotFeedback(payload: CreatePilotFeedbackPayload) {
    const response = await apiClient.post<ApiResponse<{ id: string; message: string }>>(
      '/governance/pilot-feedback',
      payload,
    );
    return response.data.data;
  },

  async getPilotFeedbackList() {
    const response = await apiClient.get<ApiResponse<PilotFeedbackListResult>>(
      '/governance/pilot-feedback',
    );
    return response.data.data;
  },

  async getSystemLogs() {
    const response = await apiClient.get<ApiResponse<SystemLogListResult>>(
      '/governance/logs',
    );
    return response.data.data;
  },
};
