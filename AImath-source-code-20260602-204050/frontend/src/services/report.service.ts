import { apiClient } from '@/lib/api';
import type { ApiResponse, ReportOverviewResult } from '@/types/api';

export const reportService = {
  async getOverview(trendDays = 7) {
    const response = await apiClient.get<ApiResponse<ReportOverviewResult>>(
      '/reports/overview',
      {
        params: {
          trendDays,
        },
      },
    );
    return response.data.data;
  },
};
