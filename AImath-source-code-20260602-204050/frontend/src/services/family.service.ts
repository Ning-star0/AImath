import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

export interface FamilyOverviewResult {
  child: {
    id: string;
    displayName: string;
    studentCode: string;
    grade: number;
    className?: string | null;
    schoolName?: string | null;
  } | null;
  summary: {
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    accuracyRate: number;
    unresolvedWrongCount: number;
    aiQaCount: number;
  };
  weakKnowledgePoints: Array<{
    knowledgePointId: string;
    knowledgePointName: string;
    correctRate: number;
    total: number;
    wrongCount: number;
  }>;
  learningTrend: Array<{
    date: string;
    accuracyRate: number;
    totalQuestions: number;
    correctCount: number;
  }>;
  knowledgeRadar: Array<{
    knowledgePointId: string;
    knowledgePointName: string;
    mastery: number;
    insight: string;
  }>;
  wrongCauseBreakdown: Array<{
    label: string;
    count: number;
    description: string;
  }>;
  wrongQuestions: Array<{
    id: string;
    questionTitle: string;
    wrongCount: number;
    reviewStatus?: string | null;
    unresolved: boolean;
    knowledgePointName?: string | null;
  }>;
  aiSummary: {
    headline: string;
    focus: string[];
    parentSuggestion: string;
  };
  bindingOptions: Array<{
    id: string;
    relationLabel: string;
    bindingStatus: string;
    student: {
      id: string;
      displayName: string;
      studentCode: string;
      grade: number;
      className?: string | null;
      schoolName?: string | null;
    };
  }>;
}

export interface BindChildPayload {
  studentCode: string;
  studentPassword: string;
  relationLabel: string;
}

export const familyService = {
  async getOverview(childId?: string) {
    const response = await apiClient.get<ApiResponse<FamilyOverviewResult>>('/family/overview', {
      params: childId ? { childId } : undefined,
    });
    return response.data.data;
  },

  async bindChild(payload: BindChildPayload) {
    const response = await apiClient.post<
      ApiResponse<{
        id: string;
        relationLabel: string;
        child: NonNullable<FamilyOverviewResult['child']>;
        nextStep: string;
      }>
    >('/family/bind-child', payload);

    return response.data.data;
  },
};
