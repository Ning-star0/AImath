import axios from 'axios';
import { API_BASE_URL, apiClient, getStoredAccessToken } from '@/lib/api';
import type { AiQaResult, ApiResponse } from '@/types/api';

export interface AskAiPayload {
  originalQuestion: string;
  grade?: number;
  context?: Record<string, unknown>;
  fromOcr?: boolean;
  questionType?: string;
  options?: string[];
}

interface AskAiStreamHandlers {
  onStatus?: (message: string) => void;
  onChunk?: (chunk: string) => void;
  onResult?: (result: AiQaResult) => void;
}

interface StreamEventPayload {
  message?: string;
  content?: string;
}

function parseSseEvent(block: string) {
  const lines = block.split('\n');
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  const rawData = dataLines.join('\n');
  return {
    event,
    data: rawData ? JSON.parse(rawData) : null,
  };
}

export const aiService = {
  async askQuestion(payload: AskAiPayload) {
    try {
      const response = await apiClient.post<ApiResponse<AiQaResult>>(
        '/ai-qa/ask',
        payload,
        {
          // AI 结构化返回通常比普通接口慢，复杂题和长讲解需要更长等待时间。
          timeout: 90000,
        },
      );

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new Error('这道题讲解内容比较长，AI 还没来得及整理完，请稍等后再试一次。');
      }

      throw error;
    }
  },

  async askQuestionStream(
    payload: AskAiPayload,
    handlers: AskAiStreamHandlers,
  ) {
    const token = getStoredAccessToken();
    const response = await fetch(`${API_BASE_URL}/ai-qa/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      let errorMessage = '请求失败，请稍后重试。';

      try {
        const errorPayload = (await response.json()) as { message?: string };
        errorMessage = errorPayload.message ?? errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalResult: AiQaResult | null = null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        if (!block.trim()) {
          continue;
        }

        const parsed = parseSseEvent(block);

        if (parsed.event === 'status' || parsed.event === 'warning') {
          handlers.onStatus?.((parsed.data as StreamEventPayload)?.message ?? '');
        }

        if (parsed.event === 'chunk') {
          handlers.onChunk?.((parsed.data as StreamEventPayload)?.content ?? '');
        }

        if (parsed.event === 'result') {
          finalResult = parsed.data as AiQaResult;
          handlers.onResult?.(finalResult);
        }
      }
    }

    if (!finalResult) {
      throw new Error('AI 流式结果未完整返回，请稍后重试。');
    }

    return finalResult;
  },
};
