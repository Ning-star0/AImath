'use client';

interface LearningCompanionProps {
  displayName: string;
  levelTitle: string;
  streakDays: number;
  totalStars: number;
}

export function LearningCompanion({
  displayName,
  levelTitle,
  streakDays,
  totalStars,
}: LearningCompanionProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,253,244,0.94),rgba(245,243,255,0.9))] p-6 shadow-card">
      <div className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-brand-100/70 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-violet-100/70 blur-3xl" />
      <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center">
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] bg-white/85 px-5 py-6 shadow-sm">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 via-sky-100 to-violet-100 text-5xl shadow-sm">
            🤖
          </div>
          <p className="mt-3 text-sm font-semibold text-brand-700">小数老师</p>
          <p className="mt-1 text-xs text-slate-500">你的数学学习伙伴</p>
        </div>

        <div>
          <div className="inline-flex rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
            🏅 当前称号：{levelTitle}
          </div>
          <h3 className="mt-4 text-2xl font-bold text-ink">
            {displayName}，今天也继续一起闯关吧
          </h3>
          <div className="mt-4 rounded-3xl bg-white/85 px-5 py-4 text-sm leading-7 text-slate-700 shadow-sm">
            我会陪你练习、讲题、复习错题。你已经连续学习了{' '}
            <span className="font-semibold text-violet-700">{streakDays} 天</span>，
            还收集了 <span className="font-semibold text-amber-600">{totalStars} 颗星星</span>，
            每坚持一次，都会离下一次升级更近一点。
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500">今天的小提醒</p>
              <p className="mt-1 text-sm font-semibold text-brand-700">
                先做题，再问不会的地方
              </p>
            </div>
            <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500">升级秘诀</p>
              <p className="mt-1 text-sm font-semibold text-violet-700">
                练习 + 错题复习 + 今日任务
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
