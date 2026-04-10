'use client';

import { useEffect, useMemo, useState } from 'react';
import { EinsteinTipCard } from '@/components/brand/einstein-tip-card';
import { PageShell } from '@/components/base/page-shell';
import {
  AuthRequiredState,
  NetworkErrorState,
  NoReportState,
  PageLoadErrorState,
  SessionExpiredState,
} from '@/components/states/platform-states';
import { getLevelTitle, getRewardProgress, readRewardState } from '@/lib/game-rewards';
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
    const loadReport = async () => {
      try {
        const data = await reportService.getOverview();
        setReport(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '学习报告加载失败，请稍后重试。');
      }
    };

    void loadReport();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    const stored = readRewardState(currentUser.id);
    setRewardState({
      totalStars: stored.totalStars,
      streakDays: stored.streakDays,
    });
  }, [currentUser?.id]);

  const rewardProgress = useMemo(() => getRewardProgress(rewardState.totalStars), [rewardState.totalStars]);
  const levelTitle = useMemo(() => getLevelTitle(rewardProgress.level), [rewardProgress.level]);
  const weakPoint = report ? getWeakKnowledgePoint(report) : null;

  const handleGenerateAiSummary = async () => {
    if (!report) {
      return;
    }

    setAiSummaryLoading(true);

    try {
      const response = await aiService.askQuestion({
        originalQuestion: `请根据以下学习数据生成一段适合小学生阅读的学习总结：
总题数：${report.totalQuestions}
答对：${report.correctCount}
答错：${report.wrongCount}
正确率：${report.accuracyRate}%
AI讲题次数：${report.aiQaCount ?? 0}`,
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

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="学习报告" description="查看最近一段时间的学习结果和建议。">
        <AuthRequiredState />
      </PageShell>
    );
  }

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
      <section className="portal-board px-5 py-5 sm:px-6">
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
                <p className="text-sm font-black text-brand-700">当前薄弱点</p>
                <p className="mt-3 font-math-display text-2xl font-extrabold text-ink">
                  {weakPoint?.knowledgePointName ?? '暂无'}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {weakPoint
                    ? `当前正确率 ${weakPoint.correctRate}% ，建议优先安排对应错题和专项练习。`
                    : '继续完成练习后，这里会生成更准确的分析。'}
                </p>
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
                  ? `建议先补强“${weakPoint.knowledgePointName}”，再回到练习页做一轮针对训练。`
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
                <div className="mt-4 rounded-[1.4rem] border border-brand-100 bg-brand-50/50 px-4 py-4">
                  <p className="text-sm leading-7 text-slate-700">{aiSummary.finalAnswer}</p>
                </div>
              ) : (
                <div className="mt-4 rounded-[1.4rem] border border-dashed border-brand-200 bg-brand-50/30 px-4 py-6 text-sm text-slate-500">
                  点击“生成总结”后，这里会出现本阶段学习总结。
                </div>
              )}
            </div>

            <div className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
              <p className="text-sm font-black text-brand-700">下一步建议</p>
              <div className="mt-4 grid gap-3">
                <a
                  href="/student/practice"
                  className="rounded-[1rem] border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  去做针对练习
                </a>
                <a
                  href="/student/wrongbook"
                  className="rounded-[1rem] border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  去复习错题
                </a>
                <a
                  href="/student/ai-qa"
                  className="rounded-[1rem] border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  去问 AI
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
