import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

export interface AdminDashboardResult {
  systemStats: {
    userCount: number;
    studentCount: number;
    teacherCount: number;
    questionCount: number;
    aiQaCount: number;
  };
  placeholders: {
    aiConfig: string;
    governance: string;
  };
}

export interface AdminUsersResult {
  list: Array<{
    id: string;
    username: string;
    displayName: string;
    role: string;
    isActive: boolean;
    studentCode?: string | null;
    teacherCode?: string | null;
    createdAt: string;
  }>;
  total: number;
}

export interface AdminQuestionsResult {
  list: Array<{
    id: string;
    title: string;
    grade: number;
    difficulty: number;
    questionType: string;
    source?: string | null;
    canDelete: boolean;
    exerciseReferenceCount: number;
    wrongbookReferenceCount: number;
    createdAt: string;
  }>;
  total: number;
}

export interface AdminAiConfigResult {
  provider: string;
  model: string;
  baseUrl?: string | null;
  promptVersion: string;
  placeholders: {
    moderation: string;
    rateLimit: string;
  };
}

export interface ImportKnowledgePointPayload {
  code: string;
  name: string;
  grade: number;
  chapter?: string;
  description?: string;
}

export interface ImportQuestionPayload {
  id?: string;
  title: string;
  stem: string;
  questionType: string;
  grade: number;
  difficulty: number;
  answer: string;
  options?: Array<{ label: string; value: string }>;
  analysis?: string;
  tags: string[];
  knowledgePointCodes?: string[];
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface ImportQuestionsPayload {
  batchName?: string;
  knowledgePoints?: ImportKnowledgePointPayload[];
  questions: ImportQuestionPayload[];
}

export interface ImportQuestionsResult {
  batchName?: string | null;
  importedKnowledgePoints: number;
  importedQuestions: number;
  updatedQuestions?: number;
  deduplicatedQuestions?: number;
  totalProcessed?: number;
  questionIds: string[];
}

export interface DeleteQuestionsResult {
  requestedCount: number;
  deletedCount: number;
  blockedCount: number;
  deletedIds: string[];
  blocked: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
  cleanupSummary?: {
    removedExerciseDetails: number;
    removedWrongQuestions: number;
    removedEmptyExerciseRecords: number;
  };
}

export const adminService = {
  async getDashboard() {
    const response = await apiClient.get<ApiResponse<AdminDashboardResult>>(
      '/admin/dashboard',
    );
    return response.data.data;
  },

  async getUsers() {
    const response = await apiClient.get<ApiResponse<AdminUsersResult>>(
      '/admin/users',
    );
    return response.data.data;
  },

  async getQuestions() {
    const response = await apiClient.get<ApiResponse<AdminQuestionsResult>>(
      '/admin/questions',
    );
    return response.data.data;
  },

  async getAiConfig() {
    const response = await apiClient.get<ApiResponse<AdminAiConfigResult>>(
      '/admin/ai-config',
    );
    return response.data.data;
  },

  async importQuestions(payload: ImportQuestionsPayload) {
    const response = await apiClient.post<ApiResponse<ImportQuestionsResult>>(
      '/questions/import-json',
      payload,
    );
    return response.data.data;
  },

  async deleteQuestions(ids: string[]) {
    const response = await apiClient.delete<ApiResponse<DeleteQuestionsResult>>(
      '/questions/batch',
      {
        data: { ids },
      },
    );
    return response.data.data;
  },
};
