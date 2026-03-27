'use client';

import Link from 'next/link';

const quickActions = [
  {
    href: '/student/practice',
    icon: '🧮',
    badge: '开始闯关',
    accent: 'from-emerald-50 to-brand-100',
    title: '去做练习',
    description: '挑几道题开始练，看看今天学得怎么样。',
  },
  {
    href: '/student/ai-qa',
    icon: '🤖',
    badge: '问问老师',
    accent: 'from-sky-50 to-violet-100',
    title: '问 AI 老师',
    description: '把不会的题发过去，AI 老师会一步一步讲。',
  },
  {
    href: '/student/wrongbook',
    icon: '📘',
    badge: '回头复习',
    accent: 'from-amber-50 to-yellow-100',
    title: '复习错题',
    description: '把做错的题再看一遍，越复习越牢固。',
  },
  {
    href: '/student/reports',
    icon: '🏆',
    badge: '看看成长',
    accent: 'from-violet-50 to-pink-100',
    title: '看看进步',
    description: '看看最近练习情况，知道自己哪里变厉害了。',
  },
];

export function QuickActions() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/92 p-7 shadow-card sm:p-8">
      <div className="pointer-events-none absolute left-8 top-0 h-24 w-24 rounded-full bg-brand-100/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-6 h-24 w-24 rounded-full bg-violet-100/50 blur-3xl" />
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
            快速开始
          </p>
          <h3 className="mt-2 text-2xl font-bold text-ink">今天想先做哪一件事？</h3>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1.5 hover:rotate-[-1deg] hover:border-brand-200"
          >
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${action.accent} opacity-80 transition group-hover:opacity-100`}
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/90 text-2xl shadow-sm">
                  {action.icon}
                </div>
                <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-brand-700 shadow-sm">
                  {action.badge}
                </span>
              </div>
              <h4 className="mt-4 text-lg font-semibold text-ink">{action.title}</h4>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {action.description}
              </p>
              <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700">
                现在就去
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
