import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { ManagedClassAssignment } from './teacher.service';

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
    schoolName?: string | null;
    subject?: string | null;
    teacherReviewStatus?: string | null;
    teacherReviewNote?: string | null;
    teacherClassAccessStatus?: string | null;
    teacherClassAccessNote?: string | null;
    requestedClasses?: ManagedClassAssignment[];
    approvedClasses?: ManagedClassAssignment[];
    createdAt: string;
  }>;
  total: number;
}

export interface ReviewTeacherResult {
  userId: string;
  displayName: string;
  reviewStatus: string | null;
  reviewNote: string | null;
  isActive: boolean;
  nextStep: string;
}

export interface ReviewTeacherClassAccessResult {
  userId: string;
  displayName: string;
  classAccessStatus: string | null;
  classAccessNote: string | null;
  requestedClasses: ManagedClassAssignment[];
  approvedClasses: ManagedClassAssignment[];
  nextStep: string;
}

export interface DeleteUserResult {
  deletedUser: {
    id: string;
    username: string;
    displayName: string;
    role: string;
  };
  cleanupSummary: {
    exerciseRecordCount: number;
    wrongQuestionCount: number;
    aiQaRecordCount: number;
    learningReportCount: number;
  };
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
  page: number;
  pageSize: number;
  totalPages: number;
  filters?: {
    grade?: number | null;
    questionType?: string | null;
  };
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

export interface AdminClassesResult {
  total: number;
  list: Array<{
    key: string;
    schoolName?: string | null;
    grade: number;
    className: string;
    studentCount: number;
    students: Array<{
      id: string;
      displayName: string;
      studentCode: string;
    }>;
    assignedTeachers: Array<{
      id: string;
      displayName: string;
      teacherCode?: string | null;
    }>;
  }>;
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

  async deleteUser(userId: string) {
    const response = await apiClient.delete<ApiResponse<DeleteUserResult>>(
      `/admin/users/${userId}`,
    );
    return response.data.data;
  },

  async reviewTeacher(
    userId: string,
    payload: { decision: 'APPROVED' | 'REJECTED'; note?: string },
  ) {
    const response = await apiClient.patch<ApiResponse<ReviewTeacherResult>>(
      `/admin/users/${userId}/teacher-review`,
      payload,
    );
    return response.data.data;
  },

  async reviewTeacherClassAccess(
    userId: string,
    payload: {
      decision: 'APPROVED' | 'REJECTED';
      note?: string;
      approvedClasses?: ManagedClassAssignment[];
    },
  ) {
    const response = await apiClient.patch<ApiResponse<ReviewTeacherClassAccessResult>>(
      `/admin/users/${userId}/teacher-class-access-review`,
      payload,
    );
    return response.data.data;
  },

  async getQuestions(params?: {
    page?: number;
    pageSize?: number;
    grade?: number;
    questionType?: string;
  }) {
    const response = await apiClient.get<ApiResponse<AdminQuestionsResult>>(
      '/admin/questions',
      {
        params,
      },
    );
    return response.data.data;
  },

  async getAiConfig() {
    const response = await apiClient.get<ApiResponse<AdminAiConfigResult>>(
      '/admin/ai-config',
    );
    return response.data.data;
  },

  async getClasses() {
    const response = await apiClient.get<ApiResponse<AdminClassesResult>>('/admin/classes');
    return response.data.data;
  },

  async assignStudentToClass(
    studentId: string,
    payload: { grade: number; className: string; schoolName?: string | null },
  ) {
    const response = await apiClient.patch<
      ApiResponse<{
        id: string;
        displayName: string;
        grade: number;
        className: string | null;
        schoolName: string | null;
      }>
    >(`/admin/students/${studentId}/class-assignment`, payload);
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
