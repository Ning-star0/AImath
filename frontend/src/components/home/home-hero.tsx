'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useUserStore } from '@/store/use-user-store';

const quickLinks = [
  {
    href: '/student/practice',
    title: '开始练习',
    description: '按年级做数学题，马上进入今天的学习状态。',
  },
  {
    href: '/student/ai-qa',
    title: 'AI 答疑',
    description: '不会的题随时问，获得适合小学生的分步讲解。',
  },
  {
    href: '/student/wrongbook',
    title: '错题复习',
    description: '把做错的题重新练一练，慢慢变成会做的题。',
  },
  {
    href: '/student/reports',
    title: '学习报告',
    description: '看看最近做题情况，找到自己进步的地方。',
  },
];

export function HomeHero() {
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const currentUser = useUserStore((state) => state.currentUser);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-card">
        <div className="inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
          欢迎来到今天的数学学习时间
        </div>
        <h2 className="mt-5 text-4xl font-bold leading-tight text-ink">
          {currentUser?.displayName ? `${currentUser.displayName}，一起把数学学明白` : '把每天的数学练习，变成轻松又有成就感的进步'}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
          先做几道练习题，再把不会的题问一问 AI，最后回到错题本复习。每天一点点，慢慢就会越来越熟练。
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href={currentUser ? '/student/practice' : '/login'}
            className="rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-900"
          >
            {currentUser ? '继续今天的练习' : '先登录开始学习'}
          </Link>
          <Link
            href="/student/ai-qa"
            className="rounded-full border border-brand-100 bg-brand-50 px-6 py-3 text-sm font-semibold text-brand-700 transition hover:bg-white"
          >
            试试 AI 答疑
          </Link>
        </div>
      </div>

      <div className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-8 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          今日学习任务
        </p>
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-white/90 p-4">
            <p className="text-sm font-semibold text-ink">1. 完成一组练习</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              先做几道当前年级的基础题，把状态热起来。
            </p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4">
            <p className="text-sm font-semibold text-ink">2. 解决一个不会的问题</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              把今天最困惑的一题交给 AI，一步一步看懂。
            </p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4">
            <p className="text-sm font-semibold text-ink">3. 复习最近错题</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              从错题本里挑 1 到 2 题重新练，巩固更快。
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 grid gap-5 md:grid-cols-4">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-[1.75rem] border border-white/80 bg-white/85 p-6 shadow-card transition hover:-translate-y-1"
          >
            <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
