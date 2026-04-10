import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

export type ManagedClassAssignment = {
  grade: number;
  className: string;
  schoolName?: string | null;
};

export interface TeacherAccessControl {
  canViewStudents: boolean;
  isAdminOverride?: boolean;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  classAccessStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  classAccessNote?: string | null;
  requestedClasses: ManagedClassAssignment[];
  approvedClasses: ManagedClassAssignment[];
}

export interface TeacherDashboardResult {
  classOverview: {
    studentCount: number;
    totalQuestions: number;
    classAccuracyRate: number;
    unresolvedWrongCount: number;
  };
  accessControl: TeacherAccessControl;
  placeholders: {
    classLearningOverview: string;
    studentReportEntry: string;
  };
}

export interface TeacherStudentListResult {
  accessControl: TeacherAccessControl;
  list: Array<{
    id: string;
    studentCode: string;
    displayName: string;
    grade: number;
    className?: string | null;
    schoolName?: string | null;
    totalQuestions: number;
    accuracyRate: number;
    unresolvedWrongCount: number;
    aiSummary: string;
    reportEntry: {
      path: string;
      apiPath: string;
    };
  }>;
  total: number;
}

export interface TeacherStudentReportResult {
  accessControl: TeacherAccessControl;
  student: {
    id: string;
    displayName: string;
    studentCode: string;
    grade: number;
    className?: string | null;
    schoolName?: string | null;
  };
  reportSummary: {
    totalQuestions: number;
    accuracyRate: number;
    unresolvedWrongCount: number;
    correctCount: number;
  };
  aiLearningInsight: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    teacherFocus: string[];
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  weakKnowledgePoints: Array<{
    knowledgePointId: string;
    knowledgePointName: string;
    total: number;
    wrongCount: number;
    correctRate: number;
  }>;
  recentWrongQuestions: Array<{
    id: string;
    questionId: string;
    stem: string;
    wrongCount: number;
    reviewStatus?: string | null;
    knowledgePointName: string;
  }>;
  teacherActions: {
    teacherFocus: string[];
    nextRecommendedKnowledgePoint: string | null;
    recommendationSummary: string;
  };
}

export interface TeacherClassAccessRequestResult {
  classAccessStatus: TeacherAccessControl['classAccessStatus'];
  requestedClasses: ManagedClassAssignment[];
  approvedClasses: ManagedClassAssignment[];
  nextStep: string;
}

export const teacherService = {
  async getDashboard() {
    const response = await apiClient.get<ApiResponse<TeacherDashboardResult>>(
      '/teacher/dashboard',
    );
    return response.data.data;
  },

  async getStudents() {
    const response = await apiClient.get<ApiResponse<TeacherStudentListResult>>(
      '/teacher/students',
    );
    return response.data.data;
  },

  async getStudentReport(studentId: string) {
    const response = await apiClient.get<ApiResponse<TeacherStudentReportResult>>(
      `/teacher/students/${studentId}/report`,
    );
    return response.data.data;
  },

  async submitClassAccessRequest(payload: { classes: ManagedClassAssignment[] }) {
    const response = await apiClient.post<ApiResponse<TeacherClassAccessRequestResult>>(
      '/teacher/class-access-request',
      payload,
    );
    return response.data.data;
  },
};
