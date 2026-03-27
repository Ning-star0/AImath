'use client';

import type { ReportQuestionDrilldownItem } from '@/types/api';

interface ReportQuestionListProps {
  title: string;
  description: string;
  items: ReportQuestionDrilldownItem[];
  activeHint?: string;
}

export function ReportQuestionList({
  title,
  description,
  items,
  activeHint,
}: ReportQuestionListProps) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card sm:p-7">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
        {activeHint ? (
          <div className="inline-flex w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {activeHint}
          </div>
        ) : null}
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </div>

      <div className="mt-5 max-h-[36rem] space-y-4 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
            这里暂时没有题目记录。
          </div>
        ) : null}

        {items.map((item) => (
          <article
            key={item.questionId}
            className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.stem}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  item.isCorrect
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {item.isCorrect ? '答对了' : '答错了'}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/90 px-4 py-3">
                <p className="text-xs text-slate-400">你的答案</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {item.studentAnswer || '未填写'}
                </p>
              </div>
              <div className="rounded-2xl bg-white/90 px-4 py-3">
                <p className="text-xs text-slate-400">正确答案</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {item.correctAnswer || '暂无'}
                </p>
              </div>
              <div className="rounded-2xl bg-white/90 px-4 py-3">
                <p className="text-xs text-slate-400">最近作答时间</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {new Date(item.latestSubmittedAt).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {item.knowledgePoints.map((point) => (
                <span
                  key={`${item.questionId}-${point.id}`}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                >
                  {point.name}
                </span>
              ))}
            </div>

            {item.feedback ? (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-sm leading-7 text-slate-600">
                {item.feedback}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
