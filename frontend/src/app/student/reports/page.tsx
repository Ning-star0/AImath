'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
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
      title: '最近做对的题目',
      description: '这里展示每道题最近一次作答中答对的题，方便你回顾自己已经掌握的内容。',
      items: report.questionDrilldowns.correct,
    };
  }

  if (activeView === 'wrong') {
    return {
      title: '最近做错的题目',
      description: '这里展示每道题最近一次作答中答错的题，方便你继续复习。',
      items: report.questionDrilldowns.wrong,
    };
  }

  if (activeView === 'accuracy') {
    return {
      title: '正确率对应题目',
      description: '正确率按每道题最近一次作答结果来算，所以这里会同时显示做对和做错的题。',
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
      description: '点开知识点后，可以看到这个知识点下最近一次作答的具体题目表现。',
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

function getEncouragement(report: ReportOverviewResult) {
  if (report.accuracyRate >= 90) {
    return '这段时间表现非常稳，已经像数学小老师一样了。接下来可以试着挑战更难一点的题。';
  }

  if (report.accuracyRate >= 70) {
    return '你已经有不错的基础了，继续把容易错的知识点补一补，会更稳。';
  }

  return '现在正是最适合慢慢补基础的时候。别着急，一题一题学清楚就会越来越顺。';
}

function getNextStep(report: ReportOverviewResult) {
  const weakest = [...report.masteryByKnowledgePoint].sort(
    (left, right) => left.correctRate - right.correctRate,
  )[0];

  if (!weakest) {
    return '先去做一轮练习，报告里就会开始出现属于你的成长建议。';
  }

  return `下一步建议先补“${weakest.knowledgePointName}”，再去做几道同类型题巩固。`;
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
  const trendRef = useRef<HTMLDivElement | null>(null);
  const knowledgeRef = useRef<HTMLDivElement | null>(null);
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
        setError(loadError instanceof Error ? loadError.message : '学习报告加载失败。');
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

  const focusQuestionView = (nextView: ActiveView, tip: string) => {
    setActiveView(nextView);
    setInteractionTip(tip);
    window.setTimeout(() => {
      scrollToSection(questionListRef.current);
    }, 120);
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
最近趋势：${report.learningTrend
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
      description="这里是一份学生看得懂的成长报告。你能看到自己做了多少题、进步了多少、下一步应该先补哪里。"
    >
      {error ? (
        <div className="rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : null}

      {interactionTip ? (
        <div className="mt-4 rounded-[1.2rem] bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 shadow-sm">
          {interactionTip}
        </div>
      ) : null}

      {report ? (
        <div className="mt-6 space-y-8">
          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <article className="math-card rounded-[2rem] bg-[linear-gradient(135deg,rgba(238,241,255,0.96),rgba(255,255,255,0.95),rgba(232,245,233,0.92))] px-6 py-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="math-chip math-chip-primary">成长报告</span>
                    <span className="math-chip math-chip-success">看得懂的进步</span>
                    <span className="math-chip math-chip-warm">下一步建议</span>
                  </div>
                  <h2 className="font-math-display text-4xl font-extrabold leading-tight text-ink">
                    最近这段时间，你在数学上进步了多少？
                  </h2>
                  <p className="mt-4 text-base leading-8 text-slate-600">
                    {getEncouragement(report)}
                  </p>
                  <div className="mt-5 rounded-[1.4rem] bg-white/88 px-5 py-4 shadow-[0_14px_28px_rgba(63,81,181,0.08)]">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">
                      下一步建议
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">
                      {getNextStep(report)}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.8rem] bg-[linear-gradient(180deg,#F8FBFF,#EEF4FF)] p-3">
                  <EinsteinMentor size="lg" mood="celebrate" badge="成长" />
                </div>
              </div>
            </article>

            <article className="math-card rounded-[2rem] px-6 py-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">成长反馈</p>
                  <h2 className="font-math-display text-3xl font-extrabold text-ink">你的成长徽章</h2>
                </div>
                <span className="math-chip math-chip-violet">成长激励</span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] bg-[#F3E5F5] px-4 py-5 text-center">
                  <p className="text-sm text-violet-700">成长等级</p>
                  <p className="mt-2 text-3xl font-bold text-violet-700">Lv.{rewardProgress.level}</p>
                  <p className="mt-2 text-xs text-slate-500">{levelTitle.title}</p>
                </div>
                <div className="rounded-[1.5rem] bg-[#FFF8E1] px-4 py-5 text-center">
                  <p className="text-sm text-amber-700">成长星星</p>
                  <p className="mt-2 text-3xl font-bold text-amber-600">{rewardState.totalStars} ★</p>
                  <p className="mt-2 text-xs text-slate-500">做题和任务都会累积</p>
                </div>
                <div className="rounded-[1.5rem] bg-[#E8F5E9] px-4 py-5 text-center">
                  <p className="text-sm text-emerald-700">连续学习</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-700">{rewardState.streakDays} 天</p>
                  <p className="mt-2 text-xs text-slate-500">坚持越久越稳</p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.4rem] bg-[#EEF4FF] px-4 py-4">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>当前经验 {rewardProgress.currentExp}</span>
                  <span>距离下一级还差 {rewardProgress.expToNextLevel - rewardProgress.currentExp}</span>
                </div>
                <ProgressBar
                  value={rewardProgress.currentExp}
                  total={rewardProgress.expToNextLevel}
                  tone="blue"
                />
              </div>
            </article>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ReportSummaryCard
              title="总做题数"
              value={`${report.totalQuestions}`}
              hint="每道题只按最近一次作答算 1 次，不会把重复练习简单累加。"
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
              title="答对题数"
              value={`${report.correctCount}`}
              hint="点开后可以查看最近一次答对了哪些题。"
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
              title="答错题数"
              value={`${report.wrongCount}`}
              hint="点开后可以查看最近一次答错了哪些题。"
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
              title="AI答疑次数"
              value={`${report.aiQaCount ?? 0}`}
              hint="AI 答疑次数单独统计，不计入做题总数。"
              accentClassName="text-violet-700"
            />
          </section>

          <section className="math-card rounded-[2rem] px-6 py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-math-display text-3xl font-extrabold text-ink">AI 学习总结</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  让 AI 把最近练习情况、薄弱点和下一步建议整理成一段更容易读懂的话。
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleGenerateAiSummary()}
                disabled={aiSummaryLoading}
                className="math-button-primary rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
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

          <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <div ref={trendRef} className="math-card rounded-[2rem] px-7 py-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-math-display text-3xl font-extrabold text-ink">最近学习趋势</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    看看最近几天做了多少题，正确率有没有更稳。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection(trendRef.current)}
                  className="math-button-secondary rounded-[1rem] px-4 py-2 text-sm font-extrabold text-slate-700"
                >
                  查看趋势
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {report.learningTrend.map((item) => (
                  <div
                    key={item.date}
                    className="rounded-[1.2rem] bg-slate-50/80 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{item.date}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          做了 {item.totalQuestions ?? 0} 题 · {item.practiceCount ?? 0} 次练习
                        </p>
                      </div>
                      <p className="font-math-display text-2xl font-extrabold text-brand-700">
                        {item.accuracyRate}%
                      </p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-brand-100">
                      <div
                        className="h-2 rounded-full bg-brand-700"
                        style={{ width: `${Math.min(item.accuracyRate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div ref={knowledgeRef} className="math-card rounded-[2rem] px-7 py-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-math-display text-3xl font-extrabold text-ink">知识点掌握</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    点击某个知识点，就能看到这个知识点下最近一次作答的题目表现。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection(knowledgeRef.current)}
                  className="math-button-secondary rounded-[1rem] px-4 py-2 text-sm font-extrabold text-slate-700"
                >
                  查看掌握
                </button>
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
                      className={`w-full rounded-[1.2rem] border p-4 text-left transition ${
                        isActive
                          ? 'border-brand-200 bg-brand-50/70 ring-2 ring-brand-100'
                          : 'border-slate-100 bg-slate-50/80 hover:border-brand-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-ink">{item.knowledgePointName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            答对 {item.correctCount} 题 · 答错 {item.wrongCount} 题
                          </p>
                        </div>
                        <p className="text-sm font-extrabold text-brand-700">
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
          </section>

          {currentList ? (
            <div ref={questionListRef}>
              <ReportQuestionList
                title={currentList.title}
                description={currentList.description}
                items={currentList.items}
                activeHint="点上面的数据卡后，这里会同步切换到对应题目明细。"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}
