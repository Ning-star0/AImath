'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
import { authService } from '@/services/auth.service';
import { reportService } from '@/services/report.service';
import { wrongbookService } from '@/services/wrongbook.service';
import { useUserStore } from '@/store/use-user-store';
import type {
  ReportOverviewResult,
  WrongbookListResult,
  WrongbookStatsResult,
} from '@/types/api';

const loopCards = [
  {
    icon: '1',
    title: '智能练习',
    desc: '按年级、难度和题型进入数学地图，先做今天该掌握的内容。',
    tone: 'bg-[#EEF1FF]',
  },
  {
    icon: '2',
    title: 'AI讲题',
    desc: '不会的题立即提问，获取分步骤讲解、提示和相似题。',
    tone: 'bg-[#F3E8FF]',
  },
  {
    icon: '3',
    title: '错题本',
    desc: '练习提交后自动沉淀错题，支持重练、归档和错因分析。',
    tone: 'bg-[#FFF3E0]',
  },
  {
    icon: '4',
    title: '学习报告',
    desc: '通过正确率、知识点掌握和趋势曲线看见真实成长。',
    tone: 'bg-[#E8F5E9]',
  },
];

const studentFeatureCards = [
  {
    title: '智能练习',
    desc: '支持年级、难度与题型练习，形成做题主链路。',
    href: '/student/practice',
    icon: '✎',
    tone: 'bg-[#EEF1FF]',
  },
  {
    title: 'AI答疑',
    desc: '随时把不会的数学题交给爱因导师讲清楚。',
    href: '/student/ai-qa',
    icon: 'AI',
    tone: 'bg-[#F3E8FF]',
  },
  {
    title: '错题诊所',
    desc: '错题自动沉淀，支持复练、错因分析和相似题生成。',
    href: '/student/wrongbook',
    icon: '!',
    tone: 'bg-[#FFF3E0]',
  },
  {
    title: '学习报告',
    desc: '展示正确率、知识点掌握和近期学习趋势。',
    href: '/student/reports',
    icon: '%',
    tone: 'bg-[#E8F5E9]',
  },
  {
    title: '数学地图',
    desc: '用任务和关卡方式进入练习，更适合小学生持续推进。',
    href: '/student/practice',
    icon: '◎',
    tone: 'bg-[#E3F2FD]',
  },
  {
    title: '个人成长',
    desc: '成长值、星星奖励和成就系统增强学习陪伴感。',
    href: '/student/profile',
    icon: '★',
    tone: 'bg-[#FFF8E1]',
  },
];

const sideRoleCards = [
  {
    title: '教师端概览',
    desc: '班级概览、学生列表、基础统计，帮助老师了解整体学习情况。',
    href: '/teacher',
    tone: 'bg-[#E8F5E9]',
  },
  {
    title: '管理端概览',
    desc: '用户管理、题库管理、系统统计，保证平台可以持续维护和迭代。',
    href: '/admin',
    tone: 'bg-[#FFF3E0]',
  },
];

export function HomeLearningOverview() {
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const setSession = useUserStore((state) => state.setSession);
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);

  const [report, setReport] = useState<ReportOverviewResult | null>(null);
  const [wrongbook, setWrongbook] = useState<WrongbookListResult | null>(null);
  const [wrongbookStats, setWrongbookStats] = useState<WrongbookStatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const loadData = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        if (!currentUser) {
          const profile = await authService.getCurrentUser();
          setSession(accessToken, profile);
        }

        const [reportData, wrongbookData, wrongbookStatsData] = await Promise.all([
          reportService.getOverview(7),
          wrongbookService.getList({
            unresolvedOnly: true,
            grade: currentUser?.grade ?? currentUser?.student?.grade ?? 3,
          }),
          wrongbookService.getStats(),
        ]);

        setReport(reportData);
        setWrongbook(wrongbookData);
        setWrongbookStats(wrongbookStatsData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '学习数据加载失败，请稍后重试。');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [accessToken, currentUser, setSession]);

  const recentWrongItems = wrongbook?.list.slice(0, 2) ?? [];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
      <section id="loop" className="math-card rounded-[2.1rem] px-6 py-7 sm:px-8">
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="math-section-label">学习闭环</span>
            <h2 className="font-math-display text-3xl font-extrabold text-ink">智能练习 → AI讲题 → 错题本 → 学习报告</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              首页必须能把产品讲明白。这套平台的核心不是某一个功能点，而是把做题、讲题、复习和反馈连成连续学习过程。
            </p>
          </div>
          <div className="rounded-[1.8rem] bg-[linear-gradient(180deg,#F8FBFF,#EAF2FF)] p-4">
            <EinsteinMentor size="md" mood="focus" badge="闭环" />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {loopCards.map((item, index) => (
            <article key={item.title} className={`relative rounded-[1.6rem] border border-white/80 ${item.tone} px-4 py-5 shadow-[0_14px_28px_rgba(63,81,181,0.08)]`}>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-base font-black text-brand-700">
                {item.icon}
              </div>
              <p className="font-math-display text-2xl font-extrabold text-ink">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
              {index < loopCards.length - 1 ? (
                <div className="pointer-events-none absolute -right-3 top-1/2 hidden h-0.5 w-6 bg-brand-300 lg:block" />
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <article className="math-card rounded-[2rem] px-6 py-7 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="math-section-label">学生端核心功能</span>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">真实功能入口，不是宣传卡片</h2>
            </div>
            <span className="math-chip math-chip-success">学生侧最完整</span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {studentFeatureCards.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={`math-lift rounded-[1.6rem] border border-white/80 ${item.tone} px-5 py-5 shadow-[0_16px_30px_rgba(63,81,181,0.08)]`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-base font-black text-brand-700">
                  {item.icon}
                </div>
                <p className="mt-4 font-math-display text-2xl font-extrabold text-ink">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-7 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="math-section-label">平台完整度</span>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">教师端 / 管理端也明确存在</h2>
            </div>
            <span className="math-chip math-chip-warm">多角色平台</span>
          </div>

          <div className="mt-6 space-y-4">
            {sideRoleCards.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={`math-lift block rounded-[1.6rem] border border-white/80 ${item.tone} px-5 py-5 shadow-[0_14px_28px_rgba(63,81,181,0.08)]`}
              >
                <p className="font-math-display text-2xl font-extrabold text-ink">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.desc}</p>
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-[1.6rem] bg-[#EEF4FF] px-5 py-5">
            <p className="font-math-display text-2xl font-extrabold text-ink">当前学习快照</p>
            {loading ? <p className="mt-3 text-sm text-slate-500">正在读取数据...</p> : null}
            {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
            {!accessToken && !loading ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                登录后这里会展示学生真实练习数据，让首页不仅有介绍，也有平台运行中的“活数据感”。
              </p>
            ) : null}
            {accessToken && report ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] bg-white/90 px-4 py-4">
                  <p className="text-sm text-slate-500">最近正确率</p>
                  <p className="mt-1 font-math-display text-3xl font-extrabold text-brand-700">
                    {report.accuracyRate}%
                  </p>
                </div>
                <div className="rounded-[1.2rem] bg-white/90 px-4 py-4">
                  <p className="text-sm text-slate-500">待复习错题</p>
                  <p className="mt-1 font-math-display text-3xl font-extrabold text-[#EF6C00]">
                    {wrongbookStats?.unresolvedCount ?? 0}
                  </p>
                </div>
              </div>
            ) : null}

            {recentWrongItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {recentWrongItems.map((item) => (
                  <article key={item.id} className="rounded-[1.2rem] bg-white/90 px-4 py-4">
                    <p className="font-bold text-ink">{item.questionTitle}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.questionStem}</p>
                  </article>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/student"
                className="math-button-primary inline-flex rounded-[1rem] px-4 py-3 text-sm font-extrabold text-white"
              >
                进入学生学习中心
              </Link>
              <Link
                href="/teacher"
                className="math-button-secondary inline-flex rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700"
              >
                查看教师端
              </Link>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
