'use client';

interface RecentLearningProps {
  recentPractice: Array<{
    title: string;
    meta: string;
  }>;
  recentWrongQuestions: Array<{
    title: string;
    meta: string;
  }>;
  recentAiQuestions: Array<{
    title: string;
    meta: string;
  }>;
}

function ActivityList({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; meta: string }>;
}) {
  return (
    <article className="rounded-3xl border border-slate-100 bg-slate-50/80 p-5">
      <h4 className="text-lg font-semibold text-ink">{title}</h4>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={`${title}-${item.title}-${item.meta}`}
            className="rounded-2xl bg-white/90 px-4 py-3"
          >
            <p className="text-sm font-medium text-slate-700">{item.title}</p>
            <p className="mt-1 text-xs leading-6 text-slate-500">{item.meta}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export function RecentLearning({
  recentPractice,
  recentWrongQuestions,
  recentAiQuestions,
}: RecentLearningProps) {
  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/92 p-7 shadow-card sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
        最近的小脚印
      </p>
      <h3 className="mt-2 text-2xl font-bold text-ink">回顾一下最近做过什么</h3>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <ActivityList title="最近做过的题" items={recentPractice} />
        <ActivityList title="最近要复习的题" items={recentWrongQuestions} />
        <ActivityList title="最近问过 AI 的内容" items={recentAiQuestions} />
      </div>
    </section>
  );
}
