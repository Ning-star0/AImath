'use client';

import Link from 'next/link';
import type { UserProfile } from '@/types/api';

interface WelcomeHeroProps {
  user: UserProfile | null;
}

export function WelcomeHero({ user }: WelcomeHeroProps) {
  const grade = user?.grade ?? user?.student?.grade ?? 3;
  const displayName = user?.displayName ?? '小同学';
  const learningGoal =
    grade <= 2
      ? '今天的小目标：做 3 道基础题，再问 AI 老师 1 个不会的地方。'
      : '今天的小目标：做完一轮练习，复习错题，再看看自己进步了多少。';
  const reminderOptions =
    grade <= 2
      ? [
          '先做几道简单题，让脑袋热起来。',
          '遇到不会的地方，马上去问 AI 老师。',
          '做完题以后，再回来复习错题。',
        ]
      : [
          '先完成一轮练习，看看今天哪里最容易出错。',
          '把错题优先复习，再去问不会的题。',
          '最后打开学习报告，看看自己进步了多少。',
        ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,253,244,0.96),rgba(239,246,255,0.92))] p-7 shadow-card sm:p-8">
      <div className="pointer-events-none absolute -left-10 top-10 h-32 w-32 rounded-full bg-brand-100/80 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-sky-100/80 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-20 h-28 w-28 rounded-full bg-violet-100/60 blur-3xl" />
      <div className="pointer-events-none absolute left-6 top-6 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
        🤖 小数老师陪你学
      </div>
      <div className="pointer-events-none absolute right-6 top-6 rounded-full bg-amber-50/90 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
        ⭐ 今日冒险开启
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
            今天也一起加油
          </p>
          <h2 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">
            {displayName}，开始今天的数学小冒险吧
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            你现在是 {grade} 年级。这里会陪你练习、复习错题，还能随时请 AI 老师一步一步讲题。
          </p>
          <div className="mt-5 rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 via-emerald-50 to-sky-50 px-5 py-4 text-sm leading-7 text-brand-800 shadow-sm">
            {learningGoal}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/student/practice"
              className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-900"
            >
              <span>🧮</span>
              现在去练习
            </Link>
            <Link
              href="/student/wrongbook"
              className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-5 py-3 text-sm font-semibold text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300"
            >
              <span>📘</span>
              先复习错题
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <article className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm">
            <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-sky-100/80 blur-2xl" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">我的学习卡</p>
                <p className="mt-2 text-2xl font-bold text-ink">{grade} 年级</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  先把本年级的基础题做熟，再一步一步挑战更难的题。
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-sky-100 text-2xl shadow-sm">
                🚀
              </div>
            </div>
          </article>
          <article className="relative overflow-hidden rounded-3xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-sm">
            <div className="pointer-events-none absolute -left-4 bottom-0 h-20 w-20 rounded-full bg-brand-100/70 blur-2xl" />
            <p className="text-sm font-semibold text-emerald-700">今天可以这样学</p>
            <div className="mt-3 space-y-2">
              {reminderOptions.map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl bg-white/85 px-3 py-3 text-sm leading-6 text-slate-700 shadow-sm"
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
