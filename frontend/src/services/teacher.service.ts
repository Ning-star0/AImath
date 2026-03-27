import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

export interface TeacherDashboardResult {
  classOverview: {
    studentCount: number;
    totalQuestions: number;
    classAccuracyRate: number;
    unresolvedWrongCount: number;
  };
  placeholders: {
    classLearningOverview: string;
    studentReportEntry: string;
  };
}

export interface TeacherStudentListResult {
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
    reportEntry: {
      path: string;
      apiPath: string;
    };
  }>;
  total: number;
}

export interface TeacherStudentReportResult {
  student: {
    id: string;
    displayName: string;
    studentCode: string;
    grade: number;
    className?: string | null;
  };
  reportSummary: {
    totalQuestions: number;
    accuracyRate: number;
    unresolvedWrongCount: number;
  };
  placeholder: string;
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
};
