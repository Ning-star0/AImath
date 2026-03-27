'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CompactAiResult } from '@/components/ai-qa/compact-ai-result';
import { PageShell } from '@/components/base/page-shell';
import { ProgressBar } from '@/components/student-home/progress-bar';
import { getLevelTitle, getRewardProgress, readRewardState } from '@/lib/game-rewards';
import { ReportQuestionList } from '@/components/reports/report-question-list';
import { ReportSummaryCard } from '@/components/reports/report-summary-card';
import { aiService } from '@/services/ai.service';
import { authService } from '@/services/auth.service';
import { reportService } from '@/services/report.service';
import { useUserStore } from '@/store/use-user-store';
import type { ReportOverviewResult, ReportQuestionDrilldownItem } from '@/types/api';

type ActiveView =
  | 'all'
  | 'correct'
  | 'wrong'
  | 'accuracy'
  | `knowledge:${string}`;

function getQuestionListByView(
  report: ReportOverviewResult,
  activeView: ActiveView,
): {
  title: string;
  description: string;
  items: ReportQuestionDrilldownItem[];
} {
  if (activeView === 'correct') {
    return {
      title: '答对的题目',
      description: '这里展示每道题最近一次作答中答对的题，重复练习不会重复累计。',
      items: report.questionDrilldowns.correct,
    };
  }

  if (activeView === 'wrong') {
    return {
      title: '答错的题目',
      description: '这里展示每道题最近一次作答中答错的题，方便你继续复习。',
      items: report.questionDrilldowns.wrong,
    };
  }

  if (activeView === 'accuracy') {
    return {
      title: '正确率对应题目',
      description: '正确率按“每道题最近一次作答结果”计算，所以这里会同时显示答对和答错的题。',
      items: report.questionDrilldowns.all,
    };
  }

  if (activeView.startsWith('knowledge:')) {
    const knowledgePointId = activeView.replace('knowledge:', '');
    const knowledgePoint = report.masteryByKnowledgePoint.find(
      (item) => item.knowledgePointId === knowledgePointId,
    );

    return {
      title: `${knowledgePoint?.knowledgePointName ?? '知识点'}相关题目`,
      description: '点击知识点后，可以看到这个知识点下最近一次作答的具体题目表现。',
      items: report.questionDrilldowns.all.filter((item) =>
        item.knowledgePoints.some((point) => point.id === knowledgePointId),
      ),
    };
  }

  return {
    title: '全部题目',
    description: '总做题数按去重后的题目统计，每道题只保留最近一次作答结果，不会把重复练习简单累加。',
    items: report.questionDrilldowns.all,
  };
}

export default function StudentReportsPage() {
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const accessToken = useUserStore((state) => state.accessToken);
  const setSession = useUserStore((state) => state.setSession);
  const [report, setReport] = useState<ReportOverviewResult | null>(null);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState<ActiveView>('all');
  const [aiSummary, setAiSummary] = useState<Awaited<ReturnType<typeof aiService.askQuestion>> | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState('');
  const [rewardState, setRewardState] = useState({
    totalStars: 0,
    streakDays: 0,
  });
  const [interactionTip, setInteractionTip] = useState('');
  const growthRef = useRef<HTMLElement | null>(null);
  const knowledgeRef = useRef<HTMLDivElement | null>(null);
  const trendRef = useRef<HTMLDivElement | null>(null);
  const questionListRef = useRef<HTMLDivElement | null>(null);

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
        // Keep the page readable even if profile sync fails.
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
        setError(loadError instanceof Error ? loadError.message : '学习报告加载失败');
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

  const currentList = useMemo(() => {
    if (!report) {
      return null;
    }

    return getQuestionListByView(report, activeView);
  }, [activeView, report]);
  const rewardProgress = useMemo(
    () => getRewardProgress(rewardState.totalStars),
    [rewardState.totalStars],
  );
  const levelTitle = useMemo(
    () => getLevelTitle(rewardProgress.level),
    [rewardProgress.level],
  );

  const scrollToSection = (target: HTMLElement | null) => {
    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const focusQuestionView = (
    nextView: ActiveView,
    tip: string,
    delayMs = 120,
  ) => {
    setActiveView(nextView);
    setInteractionTip(tip);
    window.setTimeout(() => {
      scrollToSection(questionListRef.current);
    }, delayMs);
  };

  const handleGenerateAiSummary = async () => {
    if (!report) {
      return;
    }

    setAiSummaryLoading(true);
    setAiSummaryError('');

    try {
      const response = await aiService.askQuestion({
        originalQuestion: `请根据以下学习数据生成一段适合小学生阅读的学习总结：
总题数：${report.totalQuestions}
答对题数：${report.correctCount}
答错题数：${report.wrongCount}
正确率：${report.accuracyRate}%
AI答疑次数：${report.aiQaCount ?? 0}
重点知识点：${report.masteryByKnowledgePoint
          .map((item) => `${item.knowledgePointName}(答对${item.correctCount}题,答错${item.wrongCount}题)`)
          .join('；')}
最近学习趋势：${report.learningTrend
          .map((item) => `${item.date} 做了${item.totalQuestions ?? 0}题，正确率${item.accuracyRate}%`)
          .join('；')}`,
        grade: currentUser?.grade ?? currentUser?.student?.grade ?? 3,
        context: {
          mode: 'LEARNING_SUMMARY',
          source: 'reports-page',
        },
      });

      setAiSummary(response);
    } catch (requestError) {
      setAiSummaryError(
        requestError instanceof Error
          ? requestError.message
          : 'AI 学习总结暂时不可用，请稍后再试。',
      );
    } finally {
      setAiSummaryLoading(false);
    }
  };

  return (
    <PageShell
      title="学习报告"
      description="这里像一本成长手册，会把最近学会了什么、还要再练什么、还有成长到哪一级都整理给你看。"
    >
      {error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {interactionTip ? (
        <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 shadow-sm">
          {interactionTip}
        </div>
      ) : null}

      {report ? (
        <div className="space-y-8">
          <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,253,244,0.94),rgba(239,246,255,0.92))] p-6 shadow-card">
              <div className="pointer-events-none absolute -left-8 top-4 h-24 w-24 rounded-full bg-brand-100/70 blur-3xl" />
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                成长手册
              </p>
              <h2 className="mt-3 text-2xl font-bold text-ink">看看自己这段时间进步了多少</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                这里会把最近练习、正确率、知识点掌握情况和成长等级都整理好，让你知道自己正在往前走。
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,243,255,0.94),rgba(254,249,195,0.9))] p-6 shadow-card">
              <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-violet-100/70 blur-3xl" />
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                成长提醒
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    setInteractionTip('已跳到成长等级区域，看看现在的等级、称号和离升级还差多少。');
                    scrollToSection(growthRef.current);
                  }}
                  className="rounded-2xl bg-white/85 px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5"
                >
                  <p className="text-xl">🏅</p>
                  <p className="mt-2 text-sm font-semibold text-ink">看等级</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">知道离升级还差多少</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInteractionTip('已跳到最近学习情况，可以看看最近几天的学习趋势。');
                    scrollToSection(trendRef.current);
                  }}
                  className="rounded-2xl bg-white/85 px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5"
                >
                  <p className="text-xl">📈</p>
                  <p className="mt-2 text-sm font-semibold text-ink">看趋势</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">看看最近是不是更稳了</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInteractionTip('已跳到知识点掌握情况，看看下一步先补哪个知识点。');
                    scrollToSection(knowledgeRef.current);
                  }}
                  className="rounded-2xl bg-white/85 px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5"
                >
                  <p className="text-xl">🧠</p>
                  <p className="mt-2 text-sm font-semibold text-ink">看知识点</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">知道下一步先补哪里</p>
                </button>
              </div>
            </div>
          </section>

          <section
            ref={growthRef}
            className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-card"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-violet-100 bg-violet-50/80 p-5">
                <p className="text-sm text-violet-700">成长等级</p>
                <p className="mt-2 text-3xl font-bold text-violet-700">
                  Lv.{rewardProgress.level}
                </p>
                <p className="mt-2 text-sm font-semibold text-violet-700">
                  {levelTitle.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {levelTitle.subtitle}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/80 p-5">
                <p className="text-sm text-amber-700">累计星星</p>
                <p className="mt-2 text-3xl font-bold text-amber-600">
                  {rewardState.totalStars} ⭐
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  答对题、完成任务都能得到星星奖励。
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 p-5">
                <p className="text-sm text-emerald-700">连续学习</p>
                <p className="mt-2 text-3xl font-bold text-emerald-700">
                  {rewardState.streakDays} 天
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  继续保持，连续学习天数会越来越高。
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-sky-100 bg-sky-50/70 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                <span>当前经验 {rewardProgress.currentExp}</span>
                <span>距离下一等级还差 {rewardProgress.expToNextLevel - rewardProgress.currentExp}</span>
              </div>
              <ProgressBar
                value={rewardProgress.currentExp}
                total={rewardProgress.expToNextLevel}
                tone="blue"
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-card">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-ink">AI 学习总结</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  让 AI 把最近的练习情况、薄弱点和下一步建议整理成一段更容易读懂的话。
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleGenerateAiSummary()}
                disabled={aiSummaryLoading}
                className="rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {aiSummaryLoading ? 'AI 正在总结...' : '生成 AI 学习总结'}
              </button>
            </div>

            <CompactAiResult
              title="本周学习总结"
              result={aiSummary}
              loading={aiSummaryLoading}
              error={aiSummaryError}
              variant="summary"
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ReportSummaryCard
              title="去重后总题数"
              value={`${report.totalQuestions}`}
              hint="每道题只按最近一次作答算 1 次，重复练习不会重复累计。"
              accentClassName="text-ink"
              active={activeView === 'all'}
              badgeText={activeView === 'all' ? '正在查看' : undefined}
              onClick={() =>
                focusQuestionView(
                  'all',
                  '已切换到全部题目明细，下面可以查看最近一次作答的完整情况。',
                )
              }
            />
            <ReportSummaryCard
              title="答对题目"
              value={`${report.correctCount}`}
              hint="点击查看最近一次作答答对了哪些题。"
              accentClassName="text-emerald-700"
              active={activeView === 'correct'}
              badgeText={activeView === 'correct' ? '正在查看' : undefined}
              onClick={() =>
                focusQuestionView(
                  'correct',
                  '已切换到答对题目，下面可以回顾最近一次答对的是哪些题。',
                )
              }
            />
            <ReportSummaryCard
              title="答错题目"
              value={`${report.wrongCount}`}
              hint="点击查看最近一次作答答错了哪些题。"
              accentClassName="text-amber-700"
              active={activeView === 'wrong'}
              badgeText={activeView === 'wrong' ? '正在查看' : undefined}
              onClick={() =>
                focusQuestionView(
                  'wrong',
                  '已切换到答错题目，下面可以直接查看最近一次哪里还没答对。',
                )
              }
            />
            <ReportSummaryCard
              title="正确率"
              value={`${report.accuracyRate}%`}
              hint="点击查看正确率对应的全部题目明细。"
              accentClassName="text-brand-700"
              active={activeView === 'accuracy'}
              badgeText={activeView === 'accuracy' ? '正在查看' : undefined}
              onClick={() =>
                focusQuestionView(
                  'accuracy',
                  '已切换到正确率对应题目，下面会同时看到最近一次答对和答错的题。',
                )
              }
            />
            <ReportSummaryCard
              title="AI 答疑次数"
              value={`${report.aiQaCount ?? 0}`}
              hint="AI 答疑次数单独统计，不计入做题总数。"
              accentClassName="text-violet-700"
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div
              ref={knowledgeRef}
              className="rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-card"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-ink">知识点掌握情况</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    点击某个知识点，可以看到这个知识点下最近一次答对和答错的题。
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {report.masteryByKnowledgePoint.map((item) => {
                  const isActive = activeView === `knowledge:${item.knowledgePointId}`;

                  return (
                    <button
                      key={item.knowledgePointId}
                      type="button"
                      onClick={() => {
                        focusQuestionView(
                          `knowledge:${item.knowledgePointId}`,
                          `已切换到“${item.knowledgePointName}”的题目明细，下面可以直接看哪些题答对、哪些题答错。`,
                        );
                      }}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isActive
                          ? 'border-brand-200 bg-brand-50/70 ring-2 ring-brand-100'
                          : 'border-slate-100 bg-slate-50/80 hover:border-brand-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-ink">
                            {item.knowledgePointName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            答对 {item.correctCount} 题 · 答错 {item.wrongCount} 题
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-brand-700">
                          {item.correctRate}%
                        </p>
                      </div>

                      <div className="mt-3 h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-brand-600"
                          style={{ width: `${Math.min(item.correctRate, 100)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              ref={trendRef}
              className="rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-card"
            >
              <h2 className="text-2xl font-bold text-ink">最近学习情况</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                趋势按每天去重后的题目数统计，能更真实地反映最近学了多少题。
              </p>

              <div className="mt-5 space-y-4">
                {report.learningTrend.map((item) => (
                  <div
                    key={item.date}
                    className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm text-slate-600">{item.date}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.practiceCount ?? 0} 次练习 / 去重后 {item.totalQuestions ?? 0} 题
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-brand-700">
                      {item.accuracyRate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {currentList ? (
            <div ref={questionListRef}>
              <ReportQuestionList
                title={currentList.title}
                description={currentList.description}
                items={currentList.items}
                activeHint="点上面的数据卡后，这里会同步切换到对应题目明细"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}
