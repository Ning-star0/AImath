'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { EinsteinTipCard } from '@/components/brand/einstein-tip-card';
import { PageShell } from '@/components/base/page-shell';
import {
  AuthRequiredState,
  NetworkErrorState,
  NoLearningDataState,
  PageLoadErrorState,
  PermissionDeniedState,
  SessionExpiredState,
} from '@/components/states/platform-states';
import { getPlatformErrorKind } from '@/lib/platform-errors';
import { authService } from '@/services/auth.service';
import { questionService } from '@/services/question.service';
import { reportService } from '@/services/report.service';
import { wrongbookService } from '@/services/wrongbook.service';
import { useUserStore } from '@/store/use-user-store';
import type { ReportOverviewResult, WrongQuestionItem } from '@/types/api';

type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
type SubjectKey = 'MATH';

const subjectOptions: Array<{ value: SubjectKey; label: string; status: 'ACTIVE' }> = [
  { value: 'MATH', label: '数学', status: 'ACTIVE' },
];

function buildChallengeProfile(report: ReportOverviewResult | null) {
  const answeredCount = report?.questionDrilldowns.all.length ?? 0;
  const level = Math.max(1, Math.floor(answeredCount / 10) + 1);
  const clearedStages = Math.floor(answeredCount / 5);
  return {
    level,
    clearedStages,
    answeredCount,
  };
}

function getTaskStatus(report: ReportOverviewResult | null): TaskStatus {
  const answeredCount = report?.questionDrilldowns.all.length ?? 0;

  if (answeredCount === 0) {
    return 'NOT_STARTED';
  }

  if ((report?.wrongCount ?? 0) === 0) {
    return 'COMPLETED';
  }

  return 'IN_PROGRESS';
}

export default function StudentHomePage() {
  const router = useRouter();
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const setSession = useUserStore((state) => state.setSession);
  const accessToken = useUserStore((state) => state.accessToken);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<ReportOverviewResult | null>(null);
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestionItem[]>([]);
  const [recommendedCount, setRecommendedCount] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState<SubjectKey>('MATH');

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const loadStudentHomeData = async () => {
      if (!accessToken) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const resolvedUser = currentUser ?? (await authService.getCurrentUser());

        if (!currentUser) {
          setSession(accessToken, resolvedUser);
        }

        const grade = resolvedUser.grade ?? resolvedUser.student?.grade ?? 3;

        const [reportData, wrongbookData, questionData] = await Promise.all([
          reportService.getOverview(7),
          wrongbookService.getList({ grade, unresolvedOnly: true }),
          questionService.getQuestionList({ grade, subject: selectedSubject, take: 100 }),
        ]);

        setReport(reportData);
        setWrongQuestions(wrongbookData.list);
        setRecommendedCount(questionData.list.length);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '学生首页数据加载失败，请稍后重试。');
      } finally {
        setLoading(false);
      }
    };

    void loadStudentHomeData();
  }, [accessToken, currentUser, selectedSubject, setSession]);

  const displayName = currentUser?.displayName ?? '同学';
  const grade = currentUser?.grade ?? currentUser?.student?.grade ?? 3;
  const taskStatus = useMemo(() => getTaskStatus(report), [report]);
  const challengeProfile = useMemo(() => buildChallengeProfile(report), [report]);

  const heroCopy = useMemo(() => {
    if (taskStatus === 'COMPLETED') {
      return {
        statusLabel: '已完成',
        statusTone: 'math-chip math-chip-success',
        title: '今天的练习主任务已完成',
        description: wrongQuestions.length > 0 ? '接下来建议先复习错题，再决定是否去问 AI。' : '接下来可以回看报告，或者去 AI 讲题继续巩固。',
        primaryButton: '继续巩固练习',
      };
    }

    if (taskStatus === 'IN_PROGRESS') {
      return {
        statusLabel: '进行中',
        statusTone: 'math-chip math-chip-warm',
        title: '先把今天这轮练习做完',
        description: wrongQuestions.length > 0 ? `当前还有 ${wrongQuestions.length} 道错题待复习，但先完成本轮练习更重要。` : '先把今天最重要的一轮练习做完，再决定是否去问 AI。',
        primaryButton: '继续今日练习',
      };
    }

    return {
      statusLabel: '未开始',
      statusTone: 'math-chip math-chip-primary',
      title: '今天先从这件事开始',
      description:
        recommendedCount > 0
          ? `当前有 ${recommendedCount} 道适合 ${grade} 年级的练习题，先完成第一轮练习。`
          : '今天先开始一轮练习，完成后再决定是否去 AI 讲题或复习错题。',
      primaryButton: '开始今日练习',
    };
  }, [grade, recommendedCount, taskStatus, wrongQuestions.length]);

  const mentorMessage = useMemo(() => {
    if (taskStatus === 'COMPLETED') {
      return wrongQuestions.length > 0
        ? `今天的主任务已经完成，接下来优先复习 ${wrongQuestions.length} 道错题。`
        : '今天的主任务已经完成，接下来可以去 AI 讲题或查看学习报告。';
    }

    if (taskStatus === 'IN_PROGRESS') {
      return wrongQuestions.length > 0
        ? `先把当前练习完成，再回看 ${wrongQuestions.length} 道待复习错题。`
        : '先把当前练习做完，再根据结果决定是否需要 AI 讲解。';
    }

    return '首页只保留今天最重要的学习入口。先做任务，再决定是否去问 AI 或复习错题。';
  }, [taskStatus, wrongQuestions.length]);

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="学生学习中心" description="先完成今天最重要的一轮练习。">
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'STUDENT') {
    return (
      <PageShell title="学生学习中心" description="先完成今天最重要的一轮练习。">
        <PermissionDeniedState />
      </PageShell>
    );
  }

  if (error) {
    const errorKind = getPlatformErrorKind(error);

    return (
      <PageShell title="学生学习中心" description="先完成今天最重要的一轮练习。">
        {errorKind === 'session_expired' ? (
          <SessionExpiredState />
        ) : errorKind === 'network_error' ? (
          <NetworkErrorState />
        ) : (
          <PageLoadErrorState />
        )}
      </PageShell>
    );
  }

  if (!loading && !report && recommendedCount === 0 && wrongQuestions.length === 0) {
    return (
      <PageShell title="学生学习中心" description="先完成今天最重要的一轮练习。">
        <NoLearningDataState />
      </PageShell>
    );
  }

  return (
    <PageShell title="学生学习中心" description="先完成今天最重要的一轮练习。">
      {/* Mobile layout */}
      <div className="sm:hidden">
        {/* Primary action */}
        <button
          type="button"
          onClick={() => router.push(`/student/practice?subject=${selectedSubject}`)}
          className="mb-4 w-full rounded-xl bg-brand-700 py-3.5 text-sm font-bold text-white"
        >
          {heroCopy.primaryButton}
        </button>

        {/* Stats inline */}
        <div className="mb-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
          <div className="text-center">
            <p className="text-xs text-slate-400">做题</p>
            <p className="text-lg font-extrabold text-brand-700">{report?.totalQuestions ?? 0}</p>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="text-center">
            <p className="text-xs text-slate-400">正确率</p>
            <p className="text-lg font-extrabold text-emerald-600">{report?.accuracyRate ?? 0}%</p>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="text-center">
            <p className="text-xs text-slate-400">错题</p>
            <p className="text-lg font-extrabold text-amber-600">{wrongQuestions.length}</p>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="text-center">
            <p className="text-xs text-slate-400">等级</p>
            <p className="text-lg font-extrabold text-violet-600">Lv.{challengeProfile.level}</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex gap-2">
          <Link
            href="/student/ai-qa"
            className="flex-1 rounded-xl border border-slate-200 py-3 text-center text-sm font-medium text-slate-600"
          >
            AI 讲题
          </Link>
          <Link
            href="/student/wrongbook"
            className="flex-1 rounded-xl border border-slate-200 py-3 text-center text-sm font-medium text-slate-600"
          >
            错题本
          </Link>
        </div>
      </div>

      {/* Desktop layout */}
      <section className="hidden sm:block">
        <div className="portal-board px-5 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
            <article className="rounded-[2rem] border border-[#F6D36A] bg-white px-6 py-6 shadow-[0_18px_36px_rgba(255,193,7,0.08)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className={heroCopy.statusTone}>{heroCopy.statusLabel}</span>
                <span className="math-chip math-chip-success">{grade} 年级</span>
                <span className="math-chip math-chip-primary">Lv.{challengeProfile.level}</span>
                <span className="math-chip math-chip-violet">数学</span>
              </div>

              <h2 className="mt-4 font-math-display text-4xl font-extrabold text-ink">
                {displayName}，{heroCopy.title}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{heroCopy.description}</p>

              <div className="mt-8 rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5">
                <p className="text-sm font-bold text-slate-500">今日主任务</p>
                <p className="mt-2 font-math-display text-2xl font-extrabold text-ink">先完成今天最重要的一轮练习</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  做完以后，再决定是否去 AI 讲题，或者回到错题本复习。
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold text-slate-500">当前学科</p>
                    <p className="mt-1 text-sm font-black text-ink">
                      {subjectOptions.find((item) => item.value === selectedSubject)?.label}
                    </p>
                  </div>
                  <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold text-slate-500">已通关站点</p>
                    <p className="mt-1 text-sm font-black text-ink">{challengeProfile.clearedStages} 站</p>
                  </div>
                  <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold text-slate-500">累计答题</p>
                    <p className="mt-1 text-sm font-black text-ink">{challengeProfile.answeredCount} 题</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push(`/student/practice?subject=${selectedSubject}`)}
                  className="math-button-primary rounded-[1rem] px-6 py-3 text-sm font-extrabold text-white"
                >
                  {heroCopy.primaryButton}
                </button>
                <Link
                  href="/student/ai-qa"
                  className="math-button-secondary rounded-[1rem] px-6 py-3 text-sm font-extrabold text-slate-700"
                >
                  去问 AI
                </Link>
                <Link
                  href="/student/wrongbook"
                  className="math-button-secondary rounded-[1rem] px-6 py-3 text-sm font-extrabold text-slate-700"
                >
                  复习错题
                </Link>
              </div>
            </article>

            <div className="grid gap-4">
              <EinsteinTipCard message={mentorMessage} mood="guide" tone="yellow" />

              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                <div className="math-stat-card px-4 py-5 text-center">
                  <p className="text-sm text-slate-500">总做题数</p>
                  <p className="mt-2 font-math-display text-3xl font-extrabold text-brand-700">
                    {report?.totalQuestions ?? 0}
                  </p>
                </div>
                <div className="math-stat-card px-4 py-5 text-center">
                  <p className="text-sm text-slate-500">正确率</p>
                  <p className="mt-2 font-math-display text-3xl font-extrabold text-[#2E7D32]">
                    {report?.accuracyRate ?? 0}%
                  </p>
                </div>
                <div className="math-stat-card px-4 py-5 text-center">
                  <p className="text-sm text-slate-500">待复习错题</p>
                  <p className="mt-2 font-math-display text-3xl font-extrabold text-[#EF6C00]">
                    {wrongQuestions.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
