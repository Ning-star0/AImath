import { apiClient } from '@/lib/api';
import type { ApiResponse, QuestionItem, QuestionListResult } from '@/types/api';

export interface QuestionQuery {
  grade?: number;
  difficulty?: number;
  questionType?: string;
  subject?: string;
}

export const questionService = {
  async getQuestionList(query: QuestionQuery = {}) {
    const response = await apiClient.get<ApiResponse<QuestionListResult>>(
      '/questions',
      {
        params: query,
      },
    );

    return response.data.data;
  },

  async getQuestionDetail(id: string) {
    const response = await apiClient.get<ApiResponse<QuestionItem>>(`/questions/${id}`);
    return response.data.data;
  },
};
