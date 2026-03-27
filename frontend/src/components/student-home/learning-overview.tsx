'use client';

import { getLevelTitle, getRewardProgress } from '@/lib/game-rewards';
import { GrowthCard } from './growth-card';

interface LearningOverviewProps {
  totalQuestions: number;
  accuracyRate: number;
  wrongCount: number;
  recentLearningText: string;
  totalStars: number;
  streakDays: number;
}

export function LearningOverview({
  totalQuestions,
  accuracyRate,
  wrongCount,
  recentLearningText,
  totalStars,
  streakDays,
}: LearningOverviewProps) {
  const rewardProgress = getRewardProgress(totalStars);
  const levelTitle = getLevelTitle(rewardProgress.level);

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/92 p-7 shadow-card sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
        我的学习小成绩
      </p>
      <h3 className="mt-2 text-2xl font-bold text-ink">看看最近哪里变厉害了</h3>
      <div className="mt-4 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
        Lv.{rewardProgress.level} · {levelTitle.title}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <GrowthCard
          emoji="🧮"
          title="我一共练过"
          value={`${totalQuestions}`}
          helper="一点点积累，数学会越来越熟。"
          tone="green"
        />
        <GrowthCard
          emoji="🎯"
          title="现在正确率"
          value={`${accuracyRate}%`}
          helper="答对的题越来越多，就是在进步。"
          tone="blue"
        />
        <GrowthCard
          emoji="📘"
          title="还要复习的错题"
          value={`${wrongCount}`}
          helper="把这些题再做一遍，会更稳。"
          tone="yellow"
        />
        <GrowthCard
          emoji="⭐"
          title="闯关星星"
          value={`${totalStars}`}
          helper={`当前称号：${levelTitle.title}`}
          tone="purple"
        />
        <article className="rounded-[1.75rem] border border-violet-100 bg-violet-50/70 p-5 shadow-sm transition hover:-translate-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              🔥
            </div>
            <p className="text-sm font-semibold text-slate-600">连续学习</p>
          </div>
          <p className="mt-4 text-3xl font-bold text-violet-700">{streakDays} 天</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            {recentLearningText}
          </p>
        </article>
      </div>
    </section>
  );
}
