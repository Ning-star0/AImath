'use client';

import type { AiQaResult } from '@/types/api';
import { AiChatBubble } from './ai-chat-bubble';
import { AnswerCard } from './answer-card';
import { KnowledgeTags } from './knowledge-tags';
import { SimilarQuestions } from './similar-questions';
import { StepList } from './step-list';

interface AnswerResultCardProps {
  result: AiQaResult | null;
  loading: boolean;
  streamStatus: string;
  previewLines: string[];
  helperMessage?: string;
  onUseSimilarQuestion: (question: string) => void;
  onAddSimilarQuestionToPractice: (question: string) => void;
}

function shouldShowRiskNotice(riskNotice?: string) {
  if (!riskNotice) {
    return false;
  }

  return /超出小学|信息不完整|题目不清|暂时不可用|解析失败/i.test(riskNotice);
}

export function AnswerResultCard({
  result,
  loading,
  streamStatus,
  previewLines,
  helperMessage,
  onUseSimilarQuestion,
  onAddSimilarQuestionToPractice,
}: AnswerResultCardProps) {
  const hasPreview = previewLines.length > 0;
  const showRiskNotice = shouldShowRiskNotice(result?.riskNotice);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <div className="mb-2 inline-flex rounded-full bg-brand-50/90 px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
            专属数学辅导
          </div>
          <h2 className="text-xl font-semibold text-ink">AI 讲题结果</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            先理解题意，再一步一步讲清思路，最后再回到答案和知识点。
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 shadow-sm">
          {streamStatus}
        </span>
      </div>

      <div className="max-h-[68vh] overflow-y-auto bg-white px-6 py-6 sm:px-7">
        {!result && !hasPreview ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-sky-100 text-3xl shadow-sm">
              题
            </div>
            <p className="mt-4 text-base font-medium text-slate-700">还没有开始讲题</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              输入一道数学题后，这里会按"题目理解、分步讲解、最终答案、相似题推荐"的顺序展示内容。
            </p>
          </div>
        ) : loading && hasPreview && !result ? (
          <div className="space-y-4">
            <AiChatBubble role="ai" title="爱因导师">
              我正在认真审题，马上把这道题一步一步讲给你听。
            </AiChatBubble>
            {previewLines.map((line, index) => (
              <AiChatBubble key={`${index}-${line}`} role="ai" title={`讲解进度 ${index + 1}`}>
                {line}
              </AiChatBubble>
            ))}
          </div>
        ) : result ? (
          <div className="space-y-8">
            {helperMessage ? (
              <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-700 shadow-sm">
                {helperMessage}
              </div>
            ) : null}

            <AiChatBubble role="student" title="我的题目">
              {result.originalQuestion}
            </AiChatBubble>

            <AiChatBubble
              role="ai"
              title="爱因导师"
              accent={
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                  分步骤讲解
                </span>
              }
            >
              <StepList steps={result.steps} />
            </AiChatBubble>

            <AnswerCard answer={result.finalAnswer} />

            <section className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                  涉及知识点
                </h3>
                <div className="mt-3">
                  <KnowledgeTags points={result.knowledgePoints} />
                </div>
              </div>

              {showRiskNotice ? (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                    提示说明
                  </h3>
                  <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm leading-7 text-slate-700">
                    {result.riskNotice}
                  </div>
                </div>
              ) : null}

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                  相似题推荐
                </h3>
                <div className="mt-3">
                  <SimilarQuestions
                    questions={result.similarQuestions}
                    onUseQuestion={onUseSimilarQuestion}
                    onAddToPractice={onAddSimilarQuestionToPractice}
                  />
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}
