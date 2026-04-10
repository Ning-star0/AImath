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
  imageDataUrl?: string;
  manualHint?: string;
}

export interface OcrPreviewPayload {
  imageName?: string;
  imageDataUrl?: string;
  manualText?: string;
  questionType?: string;
  grade?: number;
}

export interface OcrPreviewResult {
  status: 'READY' | 'FAILED';
  imageName?: string | null;
  recognizedText: string;
  confidence: number;
  questionType: string;
  options: string[];
  needsManualConfirmation: boolean;
  note: string;
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

const AI_STREAM_TIMEOUT_MS = 70000;

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
      const response = await apiClient.post<ApiResponse<AiQaResult>>('/ai-qa/ask', payload, {
        timeout: 90000,
      });
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new Error('讲解耗时较长，请稍后重试。');
      }
      throw error;
    }
  },

  async ocrPreview(payload: OcrPreviewPayload) {
    const response = await apiClient.post<ApiResponse<OcrPreviewResult>>(
      '/ai-qa/ocr-preview',
      payload,
    );
    return response.data.data;
  },

  async askQuestionStream(payload: AskAiPayload, handlers: AskAiStreamHandlers) {
    const token = getStoredAccessToken();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), AI_STREAM_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}/ai-qa/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
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
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('讲解时间过长，已自动停止。请精简题干后重试。');
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  },
};

