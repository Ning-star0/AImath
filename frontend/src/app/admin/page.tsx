'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
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

  const statCards = useMemo(
    () =>
      dashboard
        ? [
            ['用户总数', dashboard.systemStats.userCount, 'bg-[#EEF1FF] text-brand-700'],
            ['学生数', dashboard.systemStats.studentCount, 'bg-[#EAF7EC] text-[#2E7D32]'],
            ['教师数', dashboard.systemStats.teacherCount, 'bg-[#E7F3FF] text-[#1565C0]'],
            ['题目总数', dashboard.systemStats.questionCount, 'bg-[#FFF4E5] text-[#EF6C00]'],
            ['AI 问答数', dashboard.systemStats.aiQaCount, 'bg-[#F4EBFF] text-[#8E24AA]'],
          ]
        : [],
    [dashboard],
  );

  return (
    <PageShell
      title="系统管理中心"
      description="维护题库、用户与系统运行配置，让管理端也保持与整个平台一致的品牌语言和完成度。"
      navItems={adminNavItems}
    >
      {error ? (
        <div className="mb-6 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <article className="math-card relative overflow-hidden rounded-[2rem] px-6 py-6">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(63,81,181,0.12),transparent_58%),radial-gradient(circle_at_top_right,rgba(96,125,139,0.16),transparent_54%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-black tracking-[0.16em] text-brand-700 shadow-sm ring-1 ring-brand-100">
                ADMIN CENTER
              </div>
              <h2 className="mt-4 font-math-display text-3xl font-extrabold text-ink md:text-[2.4rem]">
                更清晰的系统概览，更像完整平台的管理端
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 md:text-base">
                管理端负责题库、用户与 AI 配置维护。视觉上更稳重，但仍然属于同一套小学数学学习平台。
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/admin/questions"
                  className="math-button-primary inline-flex rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white"
                >
                  进入题库管理
                </Link>
                <Link
                  href="/admin/users"
                  className="math-button-secondary inline-flex rounded-[1rem] px-5 py-3 text-sm font-extrabold text-slate-700"
                >
                  查看用户列表
                </Link>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-[1.8rem] bg-[linear-gradient(180deg,#F8FBFF,#EFF3FA)] px-6 py-5 text-center shadow-[0_18px_40px_rgba(63,81,181,0.14)] ring-1 ring-white/80">
              <EinsteinMentor size="md" mood="guide" badge="管理" />
              <div className="space-y-1">
                <p className="font-math-display text-xl font-extrabold text-ink">平台维护提醒</p>
                <p className="max-w-[14rem] text-sm leading-6 text-slate-600">
                  管理端偏效率工具，但品牌语言不应与学生端和教师端割裂。
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <h3 className="font-math-display text-2xl font-extrabold text-ink">系统维护重点</h3>
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.5rem] bg-[#FFF6E8] px-5 py-5">
              <p className="font-math-display text-2xl font-extrabold text-ink">题库维护</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                支持 JSON 导入、自动去重、批量删除和引用情况查看，是实际业务链路的一部分。
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[#EEF4FF] px-5 py-5">
              <p className="font-math-display text-2xl font-extrabold text-ink">用户治理</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                统一查看学生、教师和管理员账号状态，确认系统角色结构是否完整。
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[#F4EBFF] px-5 py-5">
              <p className="font-math-display text-2xl font-extrabold text-ink">AI 配置概览</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                当前模型：{aiConfig?.model ?? '未读取'}。接入方式：{aiConfig?.provider ?? 'OpenAI-compatible'}。
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map(([label, value, tone]) => (
          <article
            key={label}
            className="math-card rounded-[1.7rem] px-5 py-5 transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)]"
          >
            <div className={`inline-flex rounded-[1rem] px-3 py-2 text-xs font-black ${tone}`}>
              {label}
            </div>
            <p className="mt-4 font-math-display text-4xl font-extrabold text-ink">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
                GOVERNANCE
              </p>
              <h3 className="mt-2 font-math-display text-3xl font-extrabold text-ink">
                平台治理概览
              </h3>
            </div>
            <div className="rounded-[1rem] bg-[#F7F9FF] px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-brand-100">
              更清晰、更实用，但保留品牌感
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-[1.5rem] bg-[#F8FAFF] px-5 py-5 ring-1 ring-slate-100">
              <p className="font-math-display text-2xl font-extrabold text-ink">治理说明</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {dashboard?.placeholders.governance ??
                  '这里用于承接用户、题库和系统运行相关治理信息。'}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-[#EEF4FF] px-5 py-5">
                <p className="font-semibold text-brand-700">用户与角色</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  关注账号数量、角色完整性与是否启用，确保三角色平台能顺畅运行。
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[#FFF6E8] px-5 py-5">
                <p className="font-semibold text-[#EF6C00]">题库与引用</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  导入、去重、引用关系和删除清理都需要在一个页面里看清楚。
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
            AI CONFIG
          </p>
          <h3 className="mt-2 font-math-display text-3xl font-extrabold text-ink">AI 配置状态</h3>

          <div className="mt-6 grid gap-4">
            {[
              ['服务提供方', aiConfig?.provider ?? '未读取'],
              ['模型名称', aiConfig?.model ?? '未读取'],
              ['Prompt 版本', aiConfig?.promptVersion ?? '未读取'],
              ['Base URL', aiConfig?.baseUrl ?? '默认值'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-[1.4rem] bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100"
              >
                <span className="text-sm font-semibold text-slate-500">{label}</span>
                <span className="text-sm font-bold text-ink">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-[#F4EBFF] px-5 py-5">
              <p className="font-semibold text-[#8E24AA]">审核提示</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {aiConfig?.placeholders.moderation ?? '这里预留 AI 内容审核与安全策略信息。'}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[#EAF7EC] px-5 py-5">
              <p className="font-semibold text-[#2E7D32]">限流提示</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {aiConfig?.placeholders.rateLimit ?? '这里预留限流与稳定性治理相关信息。'}
              </p>
            </div>
          </div>
        </article>
      </section>
    </PageShell>
  );
}
