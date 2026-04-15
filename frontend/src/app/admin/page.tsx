'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/base/page-shell';
import {
  AuthRequiredState,
  NetworkErrorState,
  PageLoadErrorState,
  PermissionDeniedState,
  SessionExpiredState,
} from '@/components/states/platform-states';
import { getPlatformErrorKind } from '@/lib/platform-errors';
import {
  adminService,
  type AdminAiConfigResult,
  type AdminDashboardResult,
} from '@/services/admin.service';
import { useUserStore } from '@/store/use-user-store';

const adminNavItems = [
  { href: '/admin', label: '管理首页' },
  { href: '/admin/classes', label: '班级管理' },
  { href: '/admin/governance', label: '治理日志' },
  { href: '/admin/questions', label: '题库管理' },
  { href: '/admin/users', label: '用户列表' },
];

export default function AdminPage() {
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const [dashboard, setDashboard] = useState<AdminDashboardResult | null>(null);
  const [aiConfig, setAiConfig] = useState<AdminAiConfigResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

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
        setError(loadError instanceof Error ? loadError.message : '管理端数据加载失败。');
      }
    };

    void load();
  }, []);

  const statCards = useMemo(
    () =>
      dashboard
        ? [
            {
              label: '用户总数',
              value: dashboard.systemStats.userCount,
              tone: 'bg-[#EEF1FF] text-brand-700',
              href: '/admin/users',
              helper: '查看全部账号',
            },
            {
              label: '学生账号',
              value: dashboard.systemStats.studentCount,
              tone: 'bg-[#EAF7EC] text-[#2E7D32]',
              href: '/admin/users?role=STUDENT',
              helper: '查看学生账号',
            },
            {
              label: '教师账号',
              value: dashboard.systemStats.teacherCount,
              tone: 'bg-[#E7F3FF] text-[#1565C0]',
              href: '/admin/users?role=TEACHER',
              helper: '查看教师账号',
            },
            {
              label: '题目总数',
              value: dashboard.systemStats.questionCount,
              tone: 'bg-[#FFF4E5] text-[#EF6C00]',
              href: '/admin/questions',
              helper: '进入题库管理',
            },
            {
              label: 'AI 问答数',
              value: dashboard.systemStats.aiQaCount,
              tone: 'bg-[#F4EBFF] text-[#8E24AA]',
              href: '/admin',
              helper: '查看平台使用情况',
            },
          ]
        : [],
    [dashboard],
  );

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="系统管理中心" description="查看平台概览、题库、用户与 AI 配置。" navItems={adminNavItems}>
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'ADMIN') {
    return (
      <PageShell title="系统管理中心" description="查看平台概览、题库、用户与 AI 配置。" navItems={adminNavItems}>
        <PermissionDeniedState />
      </PageShell>
    );
  }

  if (error) {
    const kind = getPlatformErrorKind(error);
    return (
      <PageShell title="系统管理中心" description="查看平台概览、题库、用户与 AI 配置。" navItems={adminNavItems}>
        {kind === 'session_expired' ? (
          <SessionExpiredState />
        ) : kind === 'network_error' ? (
          <NetworkErrorState />
        ) : kind === 'permission_denied' ? (
          <PermissionDeniedState />
        ) : (
          <PageLoadErrorState />
        )}
      </PageShell>
    );
  }

  return (
    <PageShell
      title="系统管理中心"
      description="这里负责用户治理、教师审批、班级权限分配、题库维护和 AI 配置查看。"
      navItems={adminNavItems}
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <p className="math-section-label">Admin Workspace</p>
          <h2 className="mt-4 font-math-display text-3xl font-extrabold text-ink">
            管理员工作台
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            先看平台总览，再进入用户列表处理教师账号审核、班级权限分配和账号治理，最后维护题库与 AI 配置。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin/users"
              className="math-button-primary inline-flex rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white"
            >
              进入用户列表
            </Link>
            <Link
              href="/admin/classes"
              className="math-button-secondary inline-flex rounded-[1rem] px-5 py-3 text-sm font-extrabold text-slate-700"
            >
              班级管理
            </Link>
            <Link
              href="/admin/governance"
              className="math-button-secondary inline-flex rounded-[1rem] px-5 py-3 text-sm font-extrabold text-slate-700"
            >
              治理日志
            </Link>
            <Link
              href="/admin/questions"
              className="math-button-secondary inline-flex rounded-[1rem] px-5 py-3 text-sm font-extrabold text-slate-700"
            >
              进入题库管理
            </Link>
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <h3 className="font-math-display text-2xl font-extrabold text-ink">AI 配置状态</h3>
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.4rem] border border-slate-100 bg-white px-5 py-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">统一配置版本</p>
              <p className="mt-2 break-all text-sm font-bold text-ink">
                {aiConfig?.provider ?? '未读取'} / {aiConfig?.promptVersion ?? '未读取'}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-slate-100 bg-white px-5 py-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">文字讲题模型</p>
              <div className="mt-3 space-y-2 text-sm text-ink">
                <p>
                  <span className="font-semibold text-slate-500">服务提供方：</span>
                  {aiConfig?.textConfig.provider ?? '未读取'}
                </p>
                <p>
                  <span className="font-semibold text-slate-500">模型名称：</span>
                  {aiConfig?.textConfig.model ?? '未读取'}
                </p>
                <p className="break-all">
                  <span className="font-semibold text-slate-500">Base URL：</span>
                  {aiConfig?.textConfig.baseUrl ?? '默认值'}
                </p>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-slate-100 bg-white px-5 py-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">图片识别模型</p>
              <div className="mt-3 space-y-2 text-sm text-ink">
                <p>
                  <span className="font-semibold text-slate-500">服务提供方：</span>
                  {aiConfig?.visionConfig.provider ?? '未读取'}
                </p>
                <p>
                  <span className="font-semibold text-slate-500">模型名称：</span>
                  {aiConfig?.visionConfig.model ?? '未读取'}
                </p>
                <p className="break-all">
                  <span className="font-semibold text-slate-500">Base URL：</span>
                  {aiConfig?.visionConfig.baseUrl ?? '默认值'}
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="math-card rounded-[1.7rem] px-5 py-5 transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)]"
          >
            <div className={`inline-flex rounded-[1rem] px-3 py-2 text-xs font-black ${card.tone}`}>
              {card.label}
            </div>
            <p className="mt-4 font-math-display text-4xl font-extrabold text-ink">{card.value}</p>
            <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
          </Link>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <h3 className="font-math-display text-3xl font-extrabold text-ink">治理入口</h3>
          <div className="mt-6 grid gap-4">
            <Link
              href="/admin/classes"
              className="rounded-[1.5rem] border border-[#DDE8FF] bg-[#F8FBFF] px-5 py-5 transition hover:-translate-y-1 hover:shadow-md"
            >
              <p className="font-math-display text-2xl font-extrabold text-ink">班级管理</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                核对学生归属班级、查看教师是否覆盖对应班级，并修正班级数据。
              </p>
            </Link>
            <Link
              href="/admin/governance"
              className="rounded-[1.5rem] border border-[#E7F1FF] bg-[#F7FBFF] px-5 py-5 transition hover:-translate-y-1 hover:shadow-md"
            >
              <p className="font-math-display text-2xl font-extrabold text-ink">治理日志</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                查看试点反馈、关键操作日志和治理相关记录，为答辩与试点复盘准备材料。
              </p>
            </Link>
            <Link
              href="/admin/users?role=TEACHER&teacherReviewStatus=PENDING"
              className="rounded-[1.5rem] border border-[#F3E4A6] bg-[#FFFDF4] px-5 py-5 transition hover:-translate-y-1 hover:shadow-md"
            >
              <p className="font-math-display text-2xl font-extrabold text-ink">审核教师账号</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                处理新教师注册审核，确认教师身份信息与账号状态。
              </p>
            </Link>
            <Link
              href="/admin/users?teacherClassAccessStatus=PENDING"
              className="rounded-[1.5rem] border border-[#DDE8FF] bg-[#F8FBFF] px-5 py-5 transition hover:-translate-y-1 hover:shadow-md"
            >
              <p className="font-math-display text-2xl font-extrabold text-ink">审核班级权限</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                审核教师提交的班级管理申请，并分配可访问的班级范围。
              </p>
            </Link>
            <Link
              href="/admin/questions"
              className="rounded-[1.5rem] border border-[#FFE2BA] bg-[#FFF9F1] px-5 py-5 transition hover:-translate-y-1 hover:shadow-md"
            >
              <p className="font-math-display text-2xl font-extrabold text-ink">维护题库</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                进行导入、分页筛选、去重、删除与引用情况查看。
              </p>
            </Link>
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <h3 className="font-math-display text-3xl font-extrabold text-ink">运维说明</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-[#EEF4FF] px-5 py-5">
              <p className="font-semibold text-brand-700">用户与权限</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                管理员不只审核账号，还需要明确教师能管理哪些班级，避免跨班访问学生数据。
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[#EAF7EC] px-5 py-5">
              <p className="font-semibold text-[#2E7D32]">AI 学情支持</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                教师端看到的 AI 学情画像会根据学生做题、错题和知识点表现持续刷新。
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[#FFF6E8] px-5 py-5 md:col-span-2">
              <p className="font-semibold text-[#EF6C00]">后续建议</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                先完成教师账号审核与班级权限分配，再进入学生列表和 AI 学情画像查看，这样整条教学管理链路会更稳定。
              </p>
            </div>
          </div>
        </article>
      </section>
    </PageShell>
  );
}
