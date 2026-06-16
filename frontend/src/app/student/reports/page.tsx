'use client';

import { useEffect, useMemo, useState } from 'react';
import { CompactAiResult } from '@/components/ai-qa/compact-ai-result';
import { EinsteinTipCard } from '@/components/brand/einstein-tip-card';
import { PageShell } from '@/components/base/page-shell';
import {
  AuthRequiredState,
  NetworkErrorState,
  NoReportState,
  PageLoadErrorState,
  PermissionDeniedState,
  SessionExpiredState,
} from '@/components/states/platform-states';
import { getLevelTitle, getRewardProgress, markLearningActive, readRewardState } from '@/lib/game-rewards';
import { getPlatformErrorKind } from '@/lib/platform-errors';
import { aiService } from '@/services/ai.service';
import { authService } from '@/services/auth.service';
import { reportService } from '@/services/report.service';
import { useUserStore } from '@/store/use-user-store';
import type { ReportOverviewResult } from '@/types/api';

function getEncouragement(report: ReportOverviewResult) {
  if (report.accuracyRate >= 90) {
    return '最近状态很好，可以继续挑战更有难度的题目。';
  }

  if (report.accuracyRate >= 70) {
    return '整体进步比较稳定，再补一补薄弱点会更明显。';
  }

  return '先把基础题练扎实，再回看错题，进步会更稳定。';
}

function getWeakKnowledgePoint(report: ReportOverviewResult) {
  return [...report.masteryByKnowledgePoint].sort((left, right) => left.correctRate - right.correctRate)[0] ?? null;
}

export default function StudentReportsPage() {
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const accessToken = useUserStore((state) => state.accessToken);
  const setSession = useUserStore((state) => state.setSession);
  const [report, setReport] = useState<ReportOverviewResult | null>(null);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState<Awaited<ReturnType<typeof aiService.askQuestion>> | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [weakPointInsight, setWeakPointInsight] = useState('');
  const [weakPointRefreshing, setWeakPointRefreshing] = useState(false);
  const [rewardState, setRewardState] = useState({
    totalStars: 0,
    streakDays: 0,
  });

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const syncUser = async () => {
      if (!accessToken || currentUser) {
        return;
      }

      try {
        const profile = await authService.getCurrentUser();
        setSession(accessToken, profile);
      } catch {
        // ignore
      }
    };

    void syncUser();
  }, [accessToken, currentUser, setSession]);

  useEffect(() => {
    if (!accessToken || currentUser?.role !== 'STUDENT') {
      return;
    }

    const loadReport = async () => {
      try {
        const data = await reportService.getOverview();
        setReport(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '学习报告加载失败，请稍后重试。');
      }
    };

    void loadReport();
  }, [accessToken, currentUser?.role]);

  useEffect(() => {
    if (!accessToken || currentUser?.role !== 'STUDENT') {
      return;
    }

    const refreshReport = async () => {
      try {
        const data = await reportService.getOverview();
        setReport(data);
      } catch {
        // ignore focus refresh errors
      }
    };

    window.addEventListener('focus', refreshReport);
    document.addEventListener('visibilitychange', refreshReport);

    return () => {
      window.removeEventListener('focus', refreshReport);
      document.removeEventListener('visibilitychange', refreshReport);
    };
  }, [accessToken, currentUser?.role]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    const refreshRewardState = () => {
      const stored = readRewardState(currentUser.id);
      setRewardState({
        totalStars: stored.totalStars,
        streakDays: stored.streakDays,
      });
    };

    refreshRewardState();
    window.addEventListener('focus', refreshRewardState);
    document.addEventListener('visibilitychange', refreshRewardState);

    return () => {
      window.removeEventListener('focus', refreshRewardState);
      document.removeEventListener('visibilitychange', refreshRewardState);
    };
  }, [currentUser?.id]);

  const rewardProgress = useMemo(() => getRewardProgress(rewardState.totalStars), [rewardState.totalStars]);
  const levelTitle = useMemo(() => getLevelTitle(rewardProgress.level), [rewardProgress.level]);
  const weakPoint = report ? getWeakKnowledgePoint(report) : null;

  useEffect(() => {
    setWeakPointInsight('');
  }, [weakPoint?.knowledgePointId]);

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="学习报告" description="查看最近练习结果、知识点掌握度和 AI 学习总结。">
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'STUDENT') {
    return (
      <PageShell title="学习报告" description="查看最近练习结果、知识点掌握度和 AI 学习总结。">
        <PermissionDeniedState />
      </PageShell>
    );
  }

  const handleGenerateAiSummary = async () => {
    if (!report) {
      return;
    }

    setAiSummaryLoading(true);

    try {
      const refreshedRewardState = markLearningActive(currentUser?.id);
      setRewardState({
        totalStars: refreshedRewardState.totalStars,
        streakDays: refreshedRewardState.streakDays,
      });

      const weakestPoints = [...report.masteryByKnowledgePoint]
        .sort((left, right) => left.correctRate - right.correctRate)
        .slice(0, 3)
        .map(
          (item, index) =>
            `${index + 1}. ${item.knowledgePointName}：正确率 ${item.correctRate}%，做错 ${item.wrongCount} 题，共做 ${item.total} 题`,
        )
        .join('\n');

      const strongestPoints = [...report.masteryByKnowledgePoint]
        .sort((left, right) => right.correctRate - left.correctRate)
        .slice(0, 2)
        .map(
          (item, index) =>
            `${index + 1}. ${item.knowledgePointName}：正确率 ${item.correctRate}%，共做 ${item.total} 题`,
        )
        .join('\n');

      const response = await aiService.askQuestion({
        originalQuestion: `请根据以下学习数据，生成一份详细的学习总结。要求：
1. 用 4 到 6 条分点步骤输出，适合小学阶段学生和家长阅读。
2. finalAnswer 必须写成一段完整总结，包含"整体表现""当前薄弱点""下一步建议"三个部分。
3. 不要空泛鼓励，要结合具体数据分析。
4. 语言要清晰、具体、适龄。

学习数据如下：
总题数：${report.totalQuestions}
答对：${report.correctCount}
答错：${report.wrongCount}
正确率：${report.accuracyRate}%
AI讲题次数：${report.aiQaCount ?? 0}
当前等级：Lv.${rewardProgress.level}
累计成长星：${rewardState.totalStars}
连续学习：${rewardState.streakDays} 天

当前薄弱知识点：
${weakestPoints || '暂无'}

当前表现较好的知识点：
${strongestPoints || '暂无'}`,
        grade: currentUser?.grade ?? currentUser?.student?.grade ?? 3,
        context: {
          mode: 'LEARNING_SUMMARY',
          source: 'reports-main-panel',
        },
      });

      setAiSummary(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'AI 学习总结生成失败，请稍后再试。');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleRefreshWeakPoint = async () => {
    setWeakPointRefreshing(true);

    try {
      const latestReport = await reportService.getOverview();
      setReport(latestReport);

      const latestWeakPoint = getWeakKnowledgePoint(latestReport);
      if (!latestWeakPoint) {
        setWeakPointInsight('');
        return;
      }

      const response = await aiService.askQuestion({
        originalQuestion: `请根据以下学习数据，用 2 到 3 条简短建议分析当前最薄弱知识点。要求：
1. 每条建议都要具体，适合家长或学生立刻执行。
2. finalAnswer 用一段话总结"为什么它是当前最薄弱点、该怎么补"。

知识点：${latestWeakPoint.knowledgePointName}
正确率：${latestWeakPoint.correctRate}%
答对：${latestWeakPoint.correctCount}
答错：${latestWeakPoint.wrongCount}
总题数：${latestWeakPoint.total}
总做题数：${latestReport.totalQuestions}
总正确率：${latestReport.accuracyRate}%`,
        grade: currentUser?.grade ?? currentUser?.student?.grade ?? 3,
        context: {
          mode: 'LEARNING_SUMMARY',
          source: 'reports-weak-point-refresh',
        },
      });

      setWeakPointInsight(response.finalAnswer);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : '薄弱点刷新失败，请稍后再试。');
    } finally {
      setWeakPointRefreshing(false);
    }
  };

  if (error && !report) {
    const errorKind = getPlatformErrorKind(error);

    return (
      <PageShell title="学习报告" description="查看最近一段时间的学习结果和建议。">
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

  if (!report) {
    return (
      <PageShell title="学习报告" description="查看最近一段时间的学习结果和建议。">
        <NoReportState />
      </PageShell>
    );
  }

  return (
    <PageShell title="学习报告" description="报告页只保留核心结果、薄弱点和下一步建议，不再展示过多分析块。">
      {/* Mobile layout */}
      <div className="sm:hidden">
        {/* Stats grid */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-[11px] text-slate-400">做题数</p>
            <p className="mt-1 text-xl font-extrabold text-brand-700">{report.totalQuestions}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-[11px] text-slate-400">正确率</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-600">{report.accuracyRate}%</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-[11px] text-slate-400">答对</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-600">{report.correctCount}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-[11px] text-slate-400">答错</p>
            <p className="mt-1 text-xl font-extrabold text-red-500">{report.wrongCount}</p>
          </div>
        </div>

        <p className="mb-3 text-sm text-slate-500">{getEncouragement(report)}</p>

        {/* Weak point */}
        <div className="mb-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400">当前薄弱点</p>
            <button
              type="button"
              onClick={() => void handleRefreshWeakPoint()}
              disabled={weakPointRefreshing}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500 disabled:opacity-60"
            >
              {weakPointRefreshing ? '刷新中' : '刷新'}
            </button>
          </div>
          <p className="mt-2 break-words text-base font-extrabold text-ink">
            {weakPoint?.knowledgePointName ?? '暂无'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {weakPoint
              ? `正确率 ${weakPoint.correctRate}%，建议优先复习`
              : '继续练习后会生成分析'}
          </p>
          {weakPointInsight ? (
            <p className="mt-2 break-words rounded-lg bg-brand-50 px-3 py-2 text-xs leading-5 text-slate-600">
              {weakPointInsight}
            </p>
          ) : null}
        </div>

        {/* Growth */}
        <div className="mb-3 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400">成长激励</p>
          <p className="mt-1 text-lg font-extrabold text-ink">Lv.{rewardProgress.level} · {levelTitle.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {rewardState.totalStars} 颗星 · 连续 {rewardState.streakDays} 天
          </p>
        </div>

        {/* AI summary */}
        <div className="mb-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400">AI 学习总结</p>
            <button
              type="button"
              onClick={() => void handleGenerateAiSummary()}
              disabled={aiSummaryLoading}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500 disabled:opacity-60"
            >
              {aiSummaryLoading ? '生成中' : '生成'}
            </button>
          </div>
          {aiSummary ? (
            <div className="mt-3">
              <CompactAiResult title="学习总结" result={aiSummary} loading={false} variant="summary" />
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-400">点击"生成"查看学习总结</p>
          )}
        </div>

        {/* Quick links */}
        <div className="flex gap-2">
          <a href="/student/practice" className="flex-1 rounded-xl bg-brand-700 py-3 text-center text-sm font-bold text-white">
            去练习
          </a>
          <a href="/student/wrongbook" className="flex-1 rounded-xl border border-slate-200 py-3 text-center text-sm font-bold text-slate-600">
            错题本
          </a>
          <a href="/student/ai-qa" className="flex-1 rounded-xl border border-slate-200 py-3 text-center text-sm font-bold text-slate-600">
            问 AI
          </a>
        </div>
      </div>

      {/* Desktop layout */}
      <section className="hidden sm:block">
        <div className="portal-board px-5 py-5 sm:px-6">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-4">
              <div className="rounded-[2rem] border border-[#F6D36A] bg-[linear-gradient(180deg,#FFFDF3,#FFFFFF)] px-5 py-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="math-chip math-chip-primary">成长报告</span>
                  <span className="math-chip math-chip-success">重点结果</span>
                </div>
                <h2 className="font-math-display text-3xl font-extrabold text-ink">最近这段时间，你学得怎么样</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{getEncouragement(report)}</p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="math-stat-card px-4 py-4 text-center">
                    <p className="text-sm text-slate-500">总做题数</p>
                    <p className="mt-2 text-3xl font-extrabold text-brand-700">{report.totalQuestions}</p>
                  </div>
                  <div className="math-stat-card px-4 py-4 text-center">
                    <p className="text-sm text-slate-500">答对</p>
                    <p className="mt-2 text-3xl font-extrabold text-emerald-600">{report.correctCount}</p>
                  </div>
                  <div className="math-stat-card px-4 py-4 text-center">
                    <p className="text-sm text-slate-500">答错</p>
                    <p className="mt-2 text-3xl font-extrabold text-red-600">{report.wrongCount}</p>
                  </div>
                  <div className="math-stat-card px-4 py-4 text-center">
                    <p className="text-sm text-slate-500">正确率</p>
                    <p className="mt-2 text-3xl font-extrabold text-[#2E7D32]">{report.accuracyRate}%</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-brand-700">当前薄弱点</p>
                    <button
                      type="button"
                      onClick={() => void handleRefreshWeakPoint()}
                      disabled={weakPointRefreshing}
                      className="math-button-secondary rounded-[0.9rem] px-3 py-2 text-xs font-extrabold text-slate-700 disabled:opacity-60"
                    >
                      {weakPointRefreshing ? '刷新中' : '刷新分析'}
                    </button>
                  </div>
                  <p className="mt-3 break-words font-math-display text-2xl font-extrabold text-ink">
                    {weakPoint?.knowledgePointName ?? '暂无'}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {weakPoint
                      ? `当前正确率 ${weakPoint.correctRate}% ，建议优先安排对应错题和专项练习。`
                      : '继续完成练习后，这里会生成更准确的分析。'}
                  </p>
                  {weakPointInsight ? (
                    <div className="mt-3 break-words rounded-[1rem] bg-brand-50/60 px-4 py-3 text-sm leading-7 text-slate-700">
                      {weakPointInsight}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
                  <p className="text-sm font-black text-brand-700">成长激励</p>
                  <p className="mt-3 font-math-display text-2xl font-extrabold text-ink">Lv.{rewardProgress.level}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {levelTitle.title}，已累计 {rewardState.totalStars} 颗成长星，连续学习 {rewardState.streakDays} 天。
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <EinsteinTipCard
                message={
                  weakPoint
                    ? `建议先补强"${weakPoint.knowledgePointName}"，再回到练习页做一轮针对训练。`
                    : '先完成一轮练习，系统会逐渐生成更完整的学习建议。'
                }
                tone="yellow"
              />

              <div className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-brand-700">AI 学习总结</p>
                    <p className="mt-1 text-sm text-slate-500">把报告整理成更容易阅读的建议</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleGenerateAiSummary()}
                    disabled={aiSummaryLoading}
                    className="math-button-secondary rounded-[1rem] px-4 py-2 text-sm font-extrabold text-slate-700 disabled:opacity-60"
                  >
                    {aiSummaryLoading ? '生成中' : '生成总结'}
                  </button>
                </div>

                {aiSummary ? (
                  <CompactAiResult
                    title="本阶段学习总结"
                    result={aiSummary}
                    loading={false}
                    variant="summary"
                  />
                ) : (
                  <div className="mt-4 rounded-[1.4rem] border border-dashed border-brand-200 bg-brand-50/30 px-4 py-6 text-sm text-slate-500">
                    点击"生成总结"后，这里会出现本阶段学习总结。
                  </div>
                )}
              </div>

              <div className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
                <p className="text-sm font-black text-brand-700">下一步建议</p>
                <div className="mt-4 grid gap-3">
                  <a href="/student/practice" className="rounded-[1rem] border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    去做针对练习
                  </a>
                  <a href="/student/wrongbook" className="rounded-[1rem] border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    去复习错题
                  </a>
                  <a href="/student/ai-qa" className="rounded-[1rem] border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    去问 AI
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
