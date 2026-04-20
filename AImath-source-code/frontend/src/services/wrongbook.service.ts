import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  WrongbookListResult,
  WrongbookStatsResult,
} from '@/types/api';

export interface WrongbookQuery {
  knowledgePointId?: string;
  grade?: number;
  questionType?: string;
  unresolvedOnly?: boolean;
  includeArchived?: boolean;
}

export const wrongbookService = {
  async getList(query: WrongbookQuery = {}) {
    const response = await apiClient.get<ApiResponse<WrongbookListResult>>(
      '/wrongbook',
      {
        params: {
          unresolvedOnly: true,
          ...query,
        },
      },
    );

    return response.data.data;
  },

  async getStats() {
    const response = await apiClient.get<ApiResponse<WrongbookStatsResult>>(
      '/wrongbook/stats',
    );
    return response.data.data;
  },

  async archive(id: string, reason?: string) {
    const response = await apiClient.patch<
      ApiResponse<{ id: string; archivedAt: string | null; reviewStatus: string | null }>
    >(`/wrongbook/${id}/archive`, {
      reason,
    });

    return response.data.data;
  },
};
