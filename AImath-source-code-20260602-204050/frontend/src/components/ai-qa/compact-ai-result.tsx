'use client';

import type { AiQaResult } from '@/types/api';

function buildStepBadge(index: number) {
  return String(index + 1).padStart(2, '0');
}

interface CompactAiResultProps {
  title: string;
  result: AiQaResult | null;
  loading: boolean;
  error?: string;
  variant?: 'steps' | 'summary';
}

export function CompactAiResult({
  title,
  result,
  loading,
  error,
  variant = 'steps',
}: CompactAiResultProps) {
  if (!loading && !error && !result) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-brand-100 bg-white/95 p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          AI 导师
        </span>
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">AI 导师正在整理更清晰的讲解内容...</p>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            {result.steps.map((step, index) => (
              <div
                key={`${title}-${index}-${step}`}
                className="flex gap-3 rounded-[1.5rem] bg-brand-50/70 px-4 py-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-xs font-bold text-brand-700 shadow-sm ring-1 ring-brand-100">
                  {variant === 'summary'
                    ? index === 0
                      ? '看'
                      : index === 1
                        ? '想'
                        : index === 2
                          ? '练'
                          : '记'
                    : buildStepBadge(index)}
                </div>
                <p className="text-sm leading-7 text-slate-700">{step}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 to-emerald-50 px-4 py-4">
            <p className="text-xs text-brand-800">{variant === 'summary' ? '学习总结' : '关键结论'}</p>
            <p className="mt-2 text-sm font-medium leading-7 text-brand-700">
              {result.finalAnswer}
            </p>
          </div>

          {result.knowledgePoints.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {result.knowledgePoints.map((point) => (
                <span
                  key={`${title}-${point}`}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                >
                  {point}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
