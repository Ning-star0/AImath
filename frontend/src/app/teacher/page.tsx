'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
import { PageShell } from '@/components/base/page-shell';
import {
  AuthRequiredState,
  NetworkErrorState,
  PageLoadErrorState,
  PermissionDeniedState,
  SessionExpiredState,
  TeacherPendingReviewState,
} from '@/components/states/platform-states';
import { getPlatformErrorKind } from '@/lib/platform-errors';
import { teacherService, type TeacherDashboardResult } from '@/services/teacher.service';
import { useUserStore } from '@/store/use-user-store';

const teacherNavItems = [
  { href: '/teacher', label: '教师首页' },
  { href: '/teacher/students', label: '学生列表' },
];

export default function TeacherPage() {
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const [data, setData] = useState<TeacherDashboardResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await teacherService.getDashboard();
        setData(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '教师端数据加载失败，请稍后重试。');
      }
    };

    void load();
  }, []);

  const summaryCards = useMemo(
    () =>
      data
        ? [
            {
              label: '班级学生数',
              value: data.classOverview.studentCount,
              tone: 'bg-[#EEF1FF] text-brand-700',
              detail: '正在使用学习平台的学生人数',
            },
            {
              label: '累计做题量',
              value: data.classOverview.totalQuestions,
              tone: 'bg-[#EAF7EC] text-[#2E7D32]',
              detail: '覆盖练习与错题复习',
            },
            {
              label: '班级正确率',
              value: `${data.classOverview.classAccuracyRate}%`,
              tone: 'bg-[#FFF4E5] text-[#EF6C00]',
              detail: '便于判断当前整体掌握情况',
            },
            {
              label: '待巩固错题',
              value: data.classOverview.unresolvedWrongCount,
              tone: 'bg-[#F4EBFF] text-[#8E24AA]',
              detail: '适合安排专项复习',
            },
          ]
        : [],
    [data],
  );

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="教师工作台" description="查看班级学情、学生进度与作业完成情况。">
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role === 'TEACHER' && currentUser.isActive === false) {
    return (
      <PageShell title="教师工作台" description="查看班级学情、学生进度与作业完成情况。">
        <TeacherPendingReviewState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'TEACHER') {
    return (
      <PageShell title="教师工作台" description="查看班级学情、学生进度与作业完成情况。">
        <PermissionDeniedState />
      </PageShell>
    );
  }

  if (error) {
    const errorKind = getPlatformErrorKind(error);

    return (
      <PageShell title="教师工作台" description="查看班级学情、学生进度与作业完成情况。">
        {errorKind === 'session_expired' ? (
          <SessionExpiredState />
        ) : errorKind === 'network_error' ? (
          <NetworkErrorState />
        ) : errorKind === 'permission_denied' ? (
          <PermissionDeniedState />
        ) : (
          <PageLoadErrorState />
        )}
      </PageShell>
    );
  }

  return (
    <PageShell
      title="教师工作区"
      description="查看班级学习进展、学生练习表现和待巩固错题，让教学跟进更清晰。"
      navItems={teacherNavItems}
    >
      <section className="grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
        <article className="math-card relative overflow-hidden rounded-[2rem] px-6 py-6">
          <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,rgba(63,81,181,0.14),transparent_62%),radial-gradient(circle_at_top_right,rgba(76,175,80,0.14),transparent_48%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-black tracking-[0.16em] text-brand-700 shadow-sm ring-1 ring-brand-100">
                TEACHER WORKSPACE
              </div>
              <h2 className="mt-4 font-math-display text-3xl font-extrabold text-ink md:text-[2.4rem]">
                更像教育工作区的班级学情首页
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 md:text-base">
                这里不是通用后台，而是老师查看班级学习进度、发现待跟进学生、安排后续巩固的统一入口。
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/teacher/students"
                  className="math-button-primary inline-flex rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white"
                >
                  查看学生列表
                </Link>
                <div className="inline-flex items-center rounded-[1rem] bg-white/90 px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-100">
                  学生练习、错题和报告都可以在教师端串联查看
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-[1.8rem] bg-[linear-gradient(180deg,#F8FBFF,#EFF5FF)] px-6 py-5 text-center shadow-[0_18px_40px_rgba(63,81,181,0.16)] ring-1 ring-white/80">
              <EinsteinMentor size="md" mood="focus" badge="教师" />
              <div className="space-y-1">
                <p className="font-math-display text-xl font-extrabold text-ink">爱因导师提醒</p>
                <p className="max-w-[14rem] text-sm leading-6 text-slate-600">
                  先看整体趋势，再找需要重点关注的学生，通常比单看数字更高效。
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <h3 className="font-math-display text-2xl font-extrabold text-ink">教师端核心能力</h3>
          <div className="mt-5 grid gap-4">
            {[
              ['班级总览', '快速看到学生规模、做题量、正确率和待巩固错题。'],
              ['学生列表', '按学生维度查看练习表现，作为后续教学跟进入口。'],
              ['报告预览', '不打断学生端主链路，也能在教师端了解学习进展。'],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-[1.4rem] border border-slate-100 bg-[linear-gradient(180deg,#FFFFFF,#F8FAFF)] px-5 py-4 shadow-sm"
              >
                <p className="font-math-display text-xl font-extrabold text-ink">{title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="math-card rounded-[1.7rem] px-5 py-5 transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)]"
          >
            <div className={`inline-flex rounded-[1rem] px-3 py-2 text-xs font-black ${card.tone}`}>
              {card.label}
            </div>
            <p className="mt-4 font-math-display text-4xl font-extrabold text-ink">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">CLASS INSIGHT</p>
              <h3 className="mt-2 font-math-display text-3xl font-extrabold text-ink">班级学情概览</h3>
            </div>
            <div className="rounded-[1rem] bg-[#EEF4FF] px-4 py-3 text-sm font-semibold text-brand-700">
              更偏教学判断，而不是后台报表
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-[1.5rem] bg-[#F7F9FF] px-5 py-5 ring-1 ring-brand-100">
              <p className="font-math-display text-2xl font-extrabold text-ink">当前观察重点</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {data?.placeholders.classLearningOverview ?? '正在整理班级近期练习、错题和正确率情况。'}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-[#EAF7EC] px-5 py-5">
                <p className="font-semibold text-[#2E7D32]">教学动作建议</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  如果待巩固错题较多，更适合优先安排针对性复习，而不是继续盲目刷题。
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[#FFF6E8] px-5 py-5">
                <p className="font-semibold text-[#EF6C00]">后续扩展方向</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  后续可以继续补充分层推荐、班级趋势对比和知识点分析，当前结构已具备正式教师入口雏形。
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">QUICK ENTRY</p>
              <h3 className="mt-2 font-math-display text-3xl font-extrabold text-ink">常用工作入口</h3>
            </div>
            <Link
              href="/teacher/students"
              className="math-button-secondary inline-flex rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700"
            >
              进入学生列表
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {[
              {
                title: '查看学生列表',
                description: '按学生维度了解练习量、正确率与待巩固错题。',
                tone: 'bg-[#EEF4FF]',
              },
              {
                title: '预览学生报告',
                description: '在教师端快速进入学生学习报告预览，不打断日常管理流程。',
                tone: 'bg-[#EAF7EC]',
              },
              {
                title: '识别重点关注对象',
                description: '结合待巩固错题和正确率，优先确定需要跟进的学生。',
                tone: 'bg-[#FFF6E8]',
              },
            ].map((item) => (
              <div key={item.title} className={`rounded-[1.5rem] px-5 py-5 ${item.tone} ring-1 ring-white/70`}>
                <p className="font-math-display text-2xl font-extrabold text-ink">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PageShell>
  );
}
