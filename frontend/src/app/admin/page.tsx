 'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell } from '@/components/base/page-shell';
import {
  adminService,
  type AdminAiConfigResult,
  type AdminDashboardResult,
} from '@/services/admin.service';

const adminNavItems = [
  { href: '/admin', label: '管理首页' },
  { href: '/admin/questions', label: '题库管理' },
  { href: '/admin/users', label: '用户列表' },
];

export default function AdminPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardResult | null>(null);
  const [aiConfig, setAiConfig] = useState<AdminAiConfigResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboardData, aiConfigData] = await Promise.all([
          adminService.getDashboard(),
          adminService.getAiConfig(),
        ]);
        setDashboard(dashboardData);
        setAiConfig(aiConfigData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '管理端数据加载失败');
      }
    };

    void load();
  }, []);

  return (
    <PageShell
      title="管理首页"
      description="管理端基础版已经接入系统统计、用户列表、题目列表和 AI 配置占位能力。"
      navItems={adminNavItems}
    >
      {error ? (
        <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {dashboard ? (
        <section className="mb-8 grid gap-4 md:grid-cols-5">
          <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
            <h2 className="text-sm text-slate-500">用户数</h2>
            <p className="mt-3 text-3xl font-bold text-ink">
              {dashboard.systemStats.userCount}
            </p>
          </article>
          <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
            <h2 className="text-sm text-slate-500">学生数</h2>
            <p className="mt-3 text-3xl font-bold text-brand-700">
              {dashboard.systemStats.studentCount}
            </p>
          </article>
          <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
            <h2 className="text-sm text-slate-500">教师数</h2>
            <p className="mt-3 text-3xl font-bold text-sky-700">
              {dashboard.systemStats.teacherCount}
            </p>
          </article>
          <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
            <h2 className="text-sm text-slate-500">题目数</h2>
            <p className="mt-3 text-3xl font-bold text-amber-700">
              {dashboard.systemStats.questionCount}
            </p>
          </article>
          <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
            <h2 className="text-sm text-slate-500">AI 答疑数</h2>
            <p className="mt-3 text-3xl font-bold text-violet-700">
              {dashboard.systemStats.aiQaCount}
            </p>
          </article>
        </section>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
          <h2 className="text-xl font-bold text-ink">题库管理</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            当前可查看基础题目列表，后续继续扩展导入、审核和编辑。
          </p>
          <Link
            href="/admin/questions"
            className="mt-4 inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700"
          >
            查看题目列表
          </Link>
        </article>
        <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
          <h2 className="text-xl font-bold text-ink">用户列表</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            当前可查看基础用户与角色状态，后续扩展治理与权限配置。
          </p>
          <Link
            href="/admin/users"
            className="mt-4 inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700"
          >
            查看用户列表
          </Link>
        </article>
        <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
          <h2 className="text-xl font-bold text-ink">AI 配置管理</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            模型：{aiConfig?.model ?? '未读取'}。{aiConfig?.placeholders.moderation ?? '后续维护模型、Prompt 模板、限流策略和回答审查规则。'}
          </p>
        </article>
      </section>
    </PageShell>
  );
}
