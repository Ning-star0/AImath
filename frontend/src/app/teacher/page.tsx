 'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell } from '@/components/base/page-shell';
import {
  teacherService,
  type TeacherDashboardResult,
} from '@/services/teacher.service';

const teacherNavItems = [
  { href: '/teacher', label: '教师首页' },
  { href: '/teacher/students', label: '学生列表' },
];

export default function TeacherPage() {
  const [data, setData] = useState<TeacherDashboardResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await teacherService.getDashboard();
        setData(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '教师端数据加载失败');
      }
    };

    void load();
  }, []);

  return (
    <PageShell
      title="教师首页"
      description="教师端基础版已经接入后端概览和学生列表入口，用于展示班级学习边界。"
      navItems={teacherNavItems}
    >
      {error ? (
        <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {data ? (
        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
            <h2 className="text-sm text-slate-500">学生人数</h2>
            <p className="mt-3 text-3xl font-bold text-ink">
              {data.classOverview.studentCount}
            </p>
          </article>
          <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
            <h2 className="text-sm text-slate-500">累计做题量</h2>
            <p className="mt-3 text-3xl font-bold text-brand-700">
              {data.classOverview.totalQuestions}
            </p>
          </article>
          <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
            <h2 className="text-sm text-slate-500">班级正确率</h2>
            <p className="mt-3 text-3xl font-bold text-emerald-700">
              {data.classOverview.classAccuracyRate}%
            </p>
          </article>
          <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
            <h2 className="text-sm text-slate-500">待巩固错题</h2>
            <p className="mt-3 text-3xl font-bold text-amber-700">
              {data.classOverview.unresolvedWrongCount}
            </p>
          </article>
        </section>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
          <h2 className="text-xl font-bold text-ink">班级概览</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {data?.placeholders.classLearningOverview ??
              '后续展示班级做题总量、活跃人数和整体正确率。'}
          </p>
        </article>
        <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
          <h2 className="text-xl font-bold text-ink">学生列表</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            查看学生基础学习概览，并预留学生报告查看入口。
          </p>
          <Link
            href="/teacher/students"
            className="mt-4 inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700"
          >
            进入学生列表
          </Link>
        </article>
        <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
          <h2 className="text-xl font-bold text-ink">知识点热区</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            后续按年级、章节和班级维度查看掌握薄弱点。
          </p>
        </article>
      </section>
    </PageShell>
  );
}
