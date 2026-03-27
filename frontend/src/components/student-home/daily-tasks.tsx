'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { awardStars } from '@/lib/game-rewards';
import { ProgressBar } from './progress-bar';
import type { UserProfile } from '@/types/api';

interface DailyTasksProps {
  user: UserProfile | null;
}

interface TaskItem {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}

function buildTasks(grade: number): TaskItem[] {
  if (grade <= 2) {
    return [
      {
        id: 'practice',
        title: '做一组热身题',
        description: '先做几道简单题，把今天的学习状态找回来。',
        href: '/student/practice',
        actionLabel: '去练习',
      },
      {
        id: 'ask-ai',
        title: '问 1 个不会的地方',
        description: '把不会的题发给 AI 老师，一步一步问清楚。',
        href: '/student/ai-qa',
        actionLabel: '去提问',
      },
      {
        id: 'review-wrong',
        title: '复习 1 道错题',
        description: '把容易出错的地方再看一遍，记得会更牢。',
        href: '/student/wrongbook',
        actionLabel: '去复习',
      },
    ];
  }

  return [
    {
      id: 'practice',
      title: '完成一轮今日练习',
      description: '先做一轮练习，看看今天最需要加强的是哪一类题。',
      href: '/student/practice',
      actionLabel: '去练习',
    },
    {
      id: 'review-wrong',
      title: '复习最近错题',
      description: '把最近最容易错的题再做一遍，会越练越稳。',
      href: '/student/wrongbook',
      actionLabel: '去复习',
    },
    {
      id: 'read-report',
      title: '看看今天的进步',
      description: '打开学习报告，看看正确率和最近的学习变化。',
      href: '/student/reports',
      actionLabel: '去查看',
    },
  ];
}

function buildStorageKey(userId?: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `student-daily-tasks:${userId ?? 'guest'}:${today}`;
}

export function DailyTasks({ user }: DailyTasksProps) {
  const grade = user?.grade ?? user?.student?.grade ?? 3;
  const tasks = useMemo(() => buildTasks(grade), [grade]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null);
  const [celebrationCount, setCelebrationCount] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(buildStorageKey(user?.id));
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setCompletedIds(parsed);
    } catch {
      setCompletedIds([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      buildStorageKey(user?.id),
      JSON.stringify(completedIds),
    );
  }, [completedIds, user?.id]);

  const pendingTasks = tasks.filter((task) => !completedIds.includes(task.id));
  const completedCount = completedIds.length;

  const handleMarkCompleted = (task: TaskItem) => {
    if (completedIds.includes(task.id) || animatingTaskId === task.id) {
      return;
    }

    setAnimatingTaskId(task.id);
    const rewardState = awardStars(user?.id, 2);
    setFeedback(
      `太棒了，已完成“${task.title}”！获得 2 颗星星，现在一共有 ${rewardState.totalStars} 颗星星啦！`,
    );
    setCelebrationCount((current) => current + 1);

    window.setTimeout(() => {
      setCompletedIds((current) =>
        current.includes(task.id) ? current : [...current, task.id],
      );
      setAnimatingTaskId(null);
    }, 420);
  };

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/92 p-7 shadow-card sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
            今日小任务
          </p>
          <h3 className="mt-2 text-2xl font-bold text-ink">一步一步完成，今天也会进步</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            每完成一项，都会留下今天的学习小成绩。
          </p>
        </div>
        <div
          key={celebrationCount}
          className="relative min-w-[220px] overflow-hidden rounded-2xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 shadow-sm"
        >
          <div className={celebrationCount > 0 ? 'animate-badge-pulse' : ''}>
            今天完成了 {completedCount} / {tasks.length} 项
          </div>
          {celebrationCount > 0 ? (
            <>
              <span className="absolute left-3 top-2 text-emerald-400 animate-float-spark">
                ✦
              </span>
              <span
                className="absolute right-4 top-3 text-brand-400 animate-float-spark"
                style={{ animationDelay: '120ms' }}
              >
                ●
              </span>
              <span
                className="absolute left-10 bottom-2 text-amber-400 animate-float-spark"
                style={{ animationDelay: '220ms' }}
              >
                ✦
              </span>
            </>
          ) : null}
        </div>
      </div>

      {feedback ? (
        <div
          key={feedback}
          className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-success-bloom"
        >
          {feedback}
        </div>
      ) : null}

      <div className="mt-5 rounded-[1.5rem] border border-brand-100 bg-brand-50/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-800">🎯 今日学习任务进度</p>
            <p className="mt-1 text-xs leading-6 text-slate-600">
              每完成一个小任务，进度条就会往前走一点。
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700">
            任务挑战
          </span>
        </div>
        <div className="mt-4">
          <ProgressBar value={completedCount} total={tasks.length} tone="green" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {pendingTasks.length > 0 ? (
          pendingTasks.map((task) => {
            const isAnimating = animatingTaskId === task.id;

            return (
              <article
                key={task.id}
                className={`rounded-3xl border border-slate-100 bg-slate-50/80 p-5 transition ${
                  isAnimating ? 'animate-task-pop' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-lg font-semibold text-ink">{task.title}</h4>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    还没完成
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {task.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={task.href}
                    className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-900"
                  >
                    {task.actionLabel}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleMarkCompleted(task)}
                    className="rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-300"
                  >
                    我完成了
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="lg:col-span-3 rounded-3xl border border-emerald-100 bg-emerald-50/80 px-5 py-6 text-center animate-success-bloom">
            <p className="text-lg font-semibold text-emerald-700">
              今天的小任务都完成啦
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              做得真棒，休息一下，或者再做几道题把今天学到的内容记得更牢。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
