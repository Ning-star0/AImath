import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  ExerciseSubmitResult,
  SubmitExercisePayload,
} from '@/types/api';

export const exerciseService = {
  async submit(payload: SubmitExercisePayload) {
    const response = await apiClient.post<ApiResponse<ExerciseSubmitResult>>(
      '/exercises/submit',
      payload,
    );
    return response.data.data;
  },

  async getDetail(id: string) {
    const response = await apiClient.get<ApiResponse<ExerciseSubmitResult>>(
      `/exercises/${id}`,
    );
    return response.data.data;
  },
};

