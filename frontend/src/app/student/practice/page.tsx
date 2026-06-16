'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CompactAiResult } from '@/components/ai-qa/compact-ai-result';
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
import { awardStars } from '@/lib/game-rewards';
import { getPlatformErrorKind } from '@/lib/platform-errors';
import { aiService } from '@/services/ai.service';
import { authService } from '@/services/auth.service';
import { exerciseService } from '@/services/exercise.service';
import { questionService } from '@/services/question.service';
import { reportService } from '@/services/report.service';
import { useUserStore } from '@/store/use-user-store';
import type { ExerciseSubmitResult, QuestionItem, ReportOverviewResult } from '@/types/api';

type AiMode = 'REVIEW_QUESTION' | 'GIVE_HINT' | 'REPHRASE_EXPLANATION';
type QuestionStatus = 'UNANSWERED' | 'CORRECT' | 'WRONG';
type PageTipTone = 'info' | 'success' | 'warning';
type StageSummary = {
  stageIndex: number;
  title: string;
  startIndex: number;
  endIndex: number;
  total: number;
  completed: number;
  wrong: number;
};

const QUESTIONS_PER_STAGE = 20;

function buildQuestionText(question: QuestionItem) {
  if (!question.options?.length) {
    return question.stem;
  }

  return `${question.stem}\n${question.options.map((item) => `${item.label}. ${item.value}`).join('\n')}`;
}

function buildStatusMap(report: ReportOverviewResult | null) {
  const map = new Map<string, QuestionStatus>();

  for (const item of report?.questionDrilldowns.all ?? []) {
    map.set(item.questionId, item.isCorrect ? 'CORRECT' : 'WRONG');
  }

  return map;
}

function getFirstPendingIndex(questions: QuestionItem[], statusMap: Map<string, QuestionStatus>) {
  const firstPending = questions.findIndex((item) => !statusMap.has(item.id));
  return firstPending >= 0 ? firstPending : 0;
}

function buildStageSummaries(questions: QuestionItem[], statusMap: Map<string, QuestionStatus>) {
  const stages: StageSummary[] = [];

  for (let index = 0; index < questions.length; index += QUESTIONS_PER_STAGE) {
    const slice = questions.slice(index, index + QUESTIONS_PER_STAGE);
    const completed = slice.filter((item) => statusMap.has(item.id)).length;
    const wrong = slice.filter((item) => statusMap.get(item.id) === 'WRONG').length;

    stages.push({
      stageIndex: stages.length,
      title: `第 ${stages.length + 1} 页`,
      startIndex: index,
      endIndex: index + slice.length - 1,
      total: slice.length,
      completed,
      wrong,
    });
  }

  return stages;
}

export default function StudentPracticePage() {
  const router = useRouter();
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const setSession = useUserStore((state) => state.setSession);
  const accessToken = useUserStore((state) => state.accessToken);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ExerciseSubmitResult | null>(null);
  const [statusMap, setStatusMap] = useState<Map<string, QuestionStatus>>(new Map());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTitle, setAiTitle] = useState('AI 辅助');
  const [aiResult, setAiResult] = useState<Awaited<ReturnType<typeof aiService.askQuestion>> | null>(null);
  const [pageTip, setPageTip] = useState('');
  const [pageTipTone, setPageTipTone] = useState<PageTipTone>('info');
  const [selectedSubject, setSelectedSubject] = useState('MATH');
  const [retryQuestionId, setRetryQuestionId] = useState('');
  const [showMobileNav, setShowMobileNav] = useState(false);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setSelectedSubject((params.get('subject') || 'MATH').toUpperCase());
    setRetryQuestionId(params.get('questionId') || '');
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!accessToken || (currentUser?.role && currentUser.role !== 'STUDENT')) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const resolvedUser = currentUser ?? (await authService.getCurrentUser());
        if (!currentUser) {
          setSession(accessToken, resolvedUser);
        }

        if (resolvedUser.role !== 'STUDENT') {
          return;
        }

        const grade = resolvedUser.grade ?? resolvedUser.student?.grade ?? 3;
        const [questionData, reportData] = await Promise.all([
          questionService.getQuestionList({ grade, subject: selectedSubject, take: 100 }),
          reportService.getOverview(),
        ]);

        const retryQuestion =
          retryQuestionId && !questionData.list.some((item) => item.id === retryQuestionId)
            ? await questionService.getQuestionDetail(retryQuestionId).catch(() => null)
            : null;

        const mergedQuestions = retryQuestion
          ? [retryQuestion, ...questionData.list]
          : questionData.list;
        const nextStatusMap = buildStatusMap(reportData);
        setQuestions(mergedQuestions);
        setStatusMap(nextStatusMap);
        setActiveIndex((current) => {
          if (mergedQuestions.length === 0) {
            return 0;
          }

          if (retryQuestionId) {
            const retryIndex = mergedQuestions.findIndex((item) => item.id === retryQuestionId);
            if (retryIndex >= 0) {
              return retryIndex;
            }
          }

          return current < mergedQuestions.length
            ? current
            : getFirstPendingIndex(mergedQuestions, nextStatusMap);
        });

        if (retryQuestionId) {
          setPageTip('当前已定位到你选择重做的那道错题，答对后会自动从错题本移除。');
          setPageTipTone('info');
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '练习题目加载失败，请稍后重试。');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [accessToken, currentUser, retryQuestionId, selectedSubject, setSession]);

  const activeQuestion = questions[activeIndex] ?? null;
  const progressLabel = questions.length > 0 ? `${activeIndex + 1} / ${questions.length}` : '0 / 0';
  const answeredCount = useMemo(() => [...statusMap.values()].filter((item) => item !== 'UNANSWERED').length, [statusMap]);
  const activeResult = useMemo(
    () => result?.details?.find((item) => item.questionId === activeQuestion?.id) ?? null,
    [activeQuestion?.id, result?.details],
  );
  const activeStatus = activeQuestion ? statusMap.get(activeQuestion.id) ?? 'UNANSWERED' : 'UNANSWERED';
  const correctCount = useMemo(() => [...statusMap.values()].filter((item) => item === 'CORRECT').length, [statusMap]);
  const accuracyRate = answeredCount === 0 ? 0 : Number(((correctCount / answeredCount) * 100).toFixed(0));
  const stageSummaries = useMemo(() => buildStageSummaries(questions, statusMap), [questions, statusMap]);
  const activeStageIndex = useMemo(
    () => stageSummaries.findIndex((stage) => activeIndex >= stage.startIndex && activeIndex <= stage.endIndex),
    [activeIndex, stageSummaries],
  );
  const activeStage = activeStageIndex >= 0 ? stageSummaries[activeStageIndex] : null;
  const visibleQuestions = activeStage
    ? questions.slice(activeStage.startIndex, activeStage.endIndex + 1)
    : questions;

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="练习闯关" description="按当前年级完成练习、查看解析并继续闯关。">
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'STUDENT') {
    return (
      <PageShell title="练习闯关" description="按当前年级完成练习、查看解析并继续闯关。">
        <PermissionDeniedState />
      </PageShell>
    );
  }

  const handleSelectQuestion = (index: number) => {
    setActiveIndex(index);
    setAiResult(null);
    setPageTip('');
    setPageTipTone('info');
  };

  const handleSelectStage = (stageIndex: number) => {
    const targetStage = stageSummaries[stageIndex];
    if (!targetStage) {
      return;
    }

    handleSelectQuestion(targetStage.startIndex);
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const refreshReportState = async (preserveIndex = activeIndex) => {
    const refreshedReport = await reportService.getOverview();
    const nextStatusMap = buildStatusMap(refreshedReport);
    setStatusMap(nextStatusMap);
    setActiveIndex((current) => {
      if (questions.length === 0) {
        return 0;
      }
      return Math.min(preserveIndex, questions.length - 1, current);
    });
  };

  const handleSubmit = async () => {
    if (!activeQuestion) {
      return;
    }

    const answer = (answers[activeQuestion.id] ?? '').trim();
    if (!answer) {
      setPageTip('请先完成当前题，再提交答案。');
      setPageTipTone('warning');
      return;
    }

    setSubmitting(true);
    setPageTip('');
    setPageTipTone('info');

    try {
      const response = await exerciseService.submit({
        answers: [{ questionId: activeQuestion.id, answer }],
        context: {
          page: 'student-practice-single-question',
          subject: selectedSubject,
        },
        subject: selectedSubject,
      });

      setResult(response);
      const currentDetail = response.details?.find((item) => item.questionId === activeQuestion.id) ?? null;
      const nextStatus = currentDetail?.isCorrect ? 'CORRECT' : 'WRONG';

      setStatusMap((current) => {
        const next = new Map(current);
        next.set(activeQuestion.id, nextStatus);
        return next;
      });

      if (currentDetail?.isCorrect) {
        awardStars(currentUser?.id, 3);
        if (retryQuestionId) {
          router.push('/student/wrongbook?resolved=1');
          return;
        }

        setPageTip('这道题答对了。你可以继续下一题，也可以留在这里再检查一遍。');
        setPageTipTone('success');
      } else {
        awardStars(currentUser?.id, 1);
        setPageTip('这道题答错了。系统已记录为错题，请先看讲解，再决定是否重新作答。');
        setPageTipTone('warning');
      }

      await refreshReportState(activeIndex);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '练习提交失败，请稍后再试。');
    } finally {
      setSubmitting(false);
    }
  };

  const requestAiSupport = async (mode: AiMode, title: string) => {
    if (!activeQuestion) {
      return;
    }

    setAiLoading(true);
    setAiTitle(title);
    setAiResult(null);

    try {
      const response = await aiService.askQuestion({
        originalQuestion: buildQuestionText(activeQuestion),
        grade: activeQuestion.grade,
        questionType: activeQuestion.questionType,
        options: activeQuestion.options?.map((item) => `${item.label}. ${item.value}`) ?? [],
        context: {
          mode,
          source: 'practice-main-panel',
          studentAnswer: answers[activeQuestion.id] ?? '',
        },
      });

      setAiResult(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'AI 辅助暂时不可用，请稍后再试。');
    } finally {
      setAiLoading(false);
    }
  };

  if (error && !loading && questions.length === 0) {
    const errorKind = getPlatformErrorKind(error);
    return (
      <PageShell title="练习闯关" description="优先完成当前题目，再决定是否需要 AI 辅助。">
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

  if (!loading && questions.length === 0) {
    return (
      <PageShell title="练习闯关" description="优先完成当前题目，再决定是否需要 AI 辅助。">
        <NoLearningDataState />
      </PageShell>
    );
  }

  return (
    <PageShell title="练习闯关" description="题目状态会按答对、答错和待做真实保留，刷新后不会丢失。">
      {pageTip ? (
        <div
          className={`mb-3 rounded-xl px-3 py-2.5 text-sm font-medium sm:mb-4 sm:rounded-[1.2rem] sm:px-4 sm:py-3 sm:font-semibold ${
            pageTipTone === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : pageTipTone === 'warning'
                ? 'bg-orange-50 text-orange-700'
                : 'bg-brand-50 text-brand-700'
          }`}
        >
          {pageTip}
        </div>
      ) : null}

      {/* Mobile layout */}
      <div className="sm:hidden">
        {/* Top bar: progress + stats */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">{progressLabel}</span>
            {activeStatus === 'CORRECT' ? <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">已答对</span> : null}
            {activeStatus === 'WRONG' ? <span className="rounded-lg bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">答错</span> : null}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{answeredCount} 已答</span>
            <span>{accuracyRate}% 正确</span>
          </div>
        </div>

        {/* Question card */}
        <div
          key={activeQuestion?.id ?? 'empty-question'}
          className={`mb-3 rounded-xl bg-white p-4 shadow-sm ${
            activeStatus === 'WRONG'
              ? 'border border-orange-200'
              : activeStatus === 'CORRECT'
                ? 'border border-emerald-200'
                : 'border border-slate-100'
          }`}
        >
          <p className="text-sm leading-7 text-slate-700">{activeQuestion?.stem}</p>

          {activeQuestion?.options?.length ? (
            <div className="mt-4 grid gap-2">
              {activeQuestion.options.map((option) => {
                const selected = answers[activeQuestion.id] === option.label;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleAnswerChange(activeQuestion.id, option.label)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                      selected
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-100 bg-white text-slate-600'
                    }`}
                  >
                    {option.label}. {option.value}
                  </button>
                );
              })}
            </div>
          ) : activeQuestion ? (
            <textarea
              value={answers[activeQuestion.id] ?? ''}
              onChange={(event) => handleAnswerChange(activeQuestion.id, event.target.value)}
              placeholder="填写答案"
              className="mt-4 min-h-24 w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-brand-300"
            />
          ) : null}

          {/* Action buttons */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-brand-700 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? '提交中...' : activeStatus === 'UNANSWERED' ? '提交' : '重新提交'}
            </button>
            <button
              type="button"
              onClick={() => handleSelectQuestion(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500 disabled:opacity-40"
            >
              上一题
            </button>
            <button
              type="button"
              onClick={() => handleSelectQuestion(Math.min(questions.length - 1, activeIndex + 1))}
              disabled={activeIndex >= questions.length - 1}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500 disabled:opacity-40"
            >
              下一题
            </button>
          </div>

          {/* Result */}
          {activeResult ? (
            <div
              className={`mt-3 rounded-xl border px-3 py-3 ${
                activeResult.isCorrect
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-orange-200 bg-orange-50'
              }`}
            >
              <p className={`text-sm font-bold ${activeResult.isCorrect ? 'text-emerald-700' : 'text-orange-700'}`}>
                {activeResult.isCorrect ? '答对了' : '答错了'}
              </p>
              <p className="mt-1 text-sm text-slate-600">正确答案：{activeResult.correctAnswer || '暂未提供'}</p>
              {activeResult.feedback ? (
                <p className="mt-1 text-sm text-slate-500">{activeResult.feedback}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Mobile AI assist bar */}
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => void requestAiSupport('GIVE_HINT', '提示一步')}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600"
          >
            提示一步
          </button>
          <button
            type="button"
            onClick={() => void requestAiSupport('REPHRASE_EXPLANATION', '换一种讲法')}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600"
          >
            换种讲法
          </button>
          <button
            type="button"
            onClick={() => void requestAiSupport('REVIEW_QUESTION', '完整讲解')}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600"
          >
            完整讲解
          </button>
        </div>

        {/* Mobile question nav toggle */}
        <button
          type="button"
          onClick={() => setShowMobileNav((v) => !v)}
          className="mb-3 w-full rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-500"
        >
          {showMobileNav ? '收起题目导航' : `题目导航 (${questions.length} 题)`}
        </button>

        {showMobileNav ? (
          <div className="mb-3 rounded-xl bg-white p-3 shadow-sm">
            {stageSummaries.length > 1 ? (
              <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <button
                  type="button"
                  onClick={() => handleSelectStage(activeStageIndex - 1)}
                  disabled={activeStageIndex <= 0}
                  className="rounded-lg px-3 py-1 text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                  上一页
                </button>
                <span className="text-xs font-bold text-slate-600">
                  {Math.max(activeStageIndex + 1, 1)} / {stageSummaries.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectStage(activeStageIndex + 1)}
                  disabled={activeStageIndex >= stageSummaries.length - 1}
                  className="rounded-lg px-3 py-1 text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                  下一页
                </button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {visibleQuestions.map((question, localIndex) => {
                const index = activeStage ? activeStage.startIndex + localIndex : localIndex;
                const questionStatus = statusMap.get(question.id) ?? 'UNANSWERED';
                const active = index === activeIndex;

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      handleSelectQuestion(index);
                      setShowMobileNav(false);
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                      active
                        ? 'bg-brand-700 text-white'
                        : questionStatus === 'WRONG'
                          ? 'bg-orange-100 text-orange-700'
                          : questionStatus === 'CORRECT'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* AI result */}
        {aiResult ? <CompactAiResult title={aiTitle} result={aiResult} loading={aiLoading} error="" /> : null}
      </div>

      {/* Desktop layout */}
      <section className="hidden sm:block">
        <div className="portal-board px-5 py-5 sm:px-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-[2rem] border border-[#F6D36A] bg-[linear-gradient(180deg,#FFFDF3,#FFFFFF)] px-5 py-5">
              <div className="mb-5 rounded-[1.5rem] border border-brand-100 bg-white px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-brand-700">地图闯关</p>
                    <p className="mt-1 text-sm text-slate-600">
                      当前学科：数学。每页 20 题，可通过分页切换到下一页继续练习。
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-3 py-2 text-xs font-black text-brand-700">
                    当前第 {Math.max(activeStageIndex + 1, 1)} 页
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {stageSummaries.map((stage) => {
                    const isActiveStage = stage.stageIndex === activeStageIndex;
                    const isComplete = stage.completed === stage.total;

                    return (
                      <button
                        key={stage.title}
                        type="button"
                        onClick={() => handleSelectStage(stage.stageIndex)}
                        className={`rounded-[1.2rem] border px-4 py-4 text-left transition ${
                          isActiveStage
                            ? 'border-brand-300 bg-brand-50 shadow-[0_10px_20px_rgba(63,81,181,0.12)]'
                            : isComplete
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black text-ink">{stage.title}</p>
                          <span className="text-xs font-bold text-slate-500">
                            {stage.completed}/{stage.total}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {stage.wrong > 0 ? `本页有 ${stage.wrong} 题待订正` : '当前页继续保持'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="math-chip math-chip-primary">当前练习</span>
                    <span className="math-chip math-chip-success">进度 {progressLabel}</span>
                    {activeStatus === 'CORRECT' ? <span className="math-chip math-chip-success">已答对</span> : null}
                    {activeStatus === 'WRONG' ? <span className="math-chip math-chip-warm">已答错，待订正</span> : null}
                  </div>
                  <h2 className="font-math-display text-3xl font-extrabold text-ink">
                    {activeQuestion?.title ?? '开始练习'}
                  </h2>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[1.2rem] bg-white px-4 py-3 text-center shadow-sm">
                    <p className="text-xs font-bold text-slate-500">已作答</p>
                    <p className="mt-1 text-2xl font-extrabold text-emerald-600">{answeredCount}</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-white px-4 py-3 text-center shadow-sm">
                    <p className="text-xs font-bold text-slate-500">当前正确率</p>
                    <p className="mt-1 text-2xl font-extrabold text-brand-700">{accuracyRate}%</p>
                  </div>
                </div>
              </div>

              <div
                key={activeQuestion?.id ?? 'empty-question'}
                className={`mt-5 rounded-[1.6rem] border bg-white/95 px-5 py-5 ${
                  activeStatus === 'WRONG'
                    ? 'border-orange-200'
                    : activeStatus === 'CORRECT'
                      ? 'border-emerald-200'
                      : 'border-brand-100'
                }`}
              >
                <p className="text-sm leading-8 text-slate-700">{activeQuestion?.stem}</p>

                {activeQuestion?.options?.length ? (
                  <div className="mt-5 grid gap-3">
                    {activeQuestion.options.map((option) => {
                      const selected = answers[activeQuestion.id] === option.label;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => handleAnswerChange(activeQuestion.id, option.label)}
                          className={`rounded-[1rem] border px-4 py-3 text-left text-sm font-semibold transition ${
                            selected
                              ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-[0_8px_18px_rgba(63,81,181,0.12)]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/40'
                          }`}
                        >
                          {option.label}. {option.value}
                        </button>
                      );
                    })}
                  </div>
                ) : activeQuestion ? (
                  <textarea
                    value={answers[activeQuestion.id] ?? ''}
                    onChange={(event) => handleAnswerChange(activeQuestion.id, event.target.value)}
                    placeholder="请在这里填写你的答案"
                    className="mt-5 min-h-32 w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-300"
                  />
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="math-button-primary rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
                  >
                    {submitting ? '正在提交' : activeStatus === 'UNANSWERED' ? '提交当前题' : '重新提交这道题'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQuestion(Math.max(0, activeIndex - 1))}
                    disabled={activeIndex === 0}
                    className="math-button-secondary rounded-[1rem] px-5 py-3 text-sm font-extrabold text-slate-700 disabled:opacity-50"
                  >
                    上一题
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQuestion(Math.min(questions.length - 1, activeIndex + 1))}
                    disabled={activeIndex >= questions.length - 1}
                    className="math-button-secondary rounded-[1rem] px-5 py-3 text-sm font-extrabold text-slate-700 disabled:opacity-50"
                  >
                    下一题
                  </button>
                </div>

                {activeResult ? (
                  <div
                    className={`mt-5 rounded-[1.4rem] border px-4 py-4 ${
                      activeResult.isCorrect
                        ? 'border-emerald-200 bg-emerald-50/80'
                        : 'border-orange-200 bg-orange-50/85'
                    }`}
                  >
                    <p
                      className={`text-sm font-black ${
                        activeResult.isCorrect ? 'text-emerald-700' : 'text-orange-700'
                      }`}
                    >
                      {activeResult.isCorrect ? '这道题答对了' : '这道题答错了，需要再看一遍'}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      正确答案：{activeResult.correctAnswer || '暂未提供'}
                    </p>
                    {activeResult.feedback ? (
                      <p className="mt-2 text-sm leading-7 text-slate-600">{activeResult.feedback}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>

            <div className="grid gap-4">
              <EinsteinTipCard
                message={
                  activeStatus === 'WRONG'
                    ? '这道题已经记录为错题。建议先看讲解，再重新作答，不会自动跳到下一题。'
                    : activeStatus === 'CORRECT'
                      ? '这道题已经答对了。你可以继续下一题，也可以在这里再检查一遍。'
                      : '先独立完成当前题，再决定是否需要提示或 AI 讲解。'
                }
                tone={activeStatus === 'WRONG' ? 'blue' : 'yellow'}
              />

              <div className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
                <p className="text-sm font-black text-brand-700">AI 辅助</p>
                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={() => void requestAiSupport('GIVE_HINT', '提示一步')}
                    className="math-button-secondary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700"
                  >
                    提示一步
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestAiSupport('REPHRASE_EXPLANATION', '换一种讲法')}
                    className="math-button-secondary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700"
                  >
                    换一种讲法
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestAiSupport('REVIEW_QUESTION', '完整讲解')}
                    className="math-button-secondary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700"
                  >
                    查看讲解
                  </button>
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
                <p className="text-sm font-black text-brand-700">题目导航</p>
                {stageSummaries.length > 1 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1rem] bg-slate-50 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSelectStage(activeStageIndex - 1)}
                      disabled={activeStageIndex <= 0}
                      className="math-button-secondary rounded-[0.9rem] px-4 py-2 text-xs font-extrabold text-slate-700 disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <span className="text-sm font-black text-slate-700">
                      第 {Math.max(activeStageIndex + 1, 1)} 页 / 共 {stageSummaries.length} 页
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectStage(activeStageIndex + 1)}
                      disabled={activeStageIndex >= stageSummaries.length - 1}
                      className="math-button-secondary rounded-[0.9rem] px-4 py-2 text-xs font-extrabold text-slate-700 disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {visibleQuestions.map((question, localIndex) => {
                    const index = activeStage ? activeStage.startIndex + localIndex : localIndex;
                    const questionStatus = statusMap.get(question.id) ?? 'UNANSWERED';
                    const active = index === activeIndex;

                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => handleSelectQuestion(index)}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition ${
                          active
                            ? questionStatus === 'WRONG'
                              ? 'border-orange-300 bg-white text-orange-700 shadow-[0_10px_20px_rgba(249,115,22,0.14)] ring-2 ring-orange-200 ring-offset-2'
                              : questionStatus === 'CORRECT'
                                ? 'border-emerald-300 bg-white text-emerald-700 shadow-[0_10px_20px_rgba(16,185,129,0.14)] ring-2 ring-emerald-200 ring-offset-2'
                                : 'border-brand-300 bg-white text-brand-700 shadow-[0_10px_20px_rgba(63,81,181,0.14)] ring-2 ring-brand-200 ring-offset-2'
                            : questionStatus === 'WRONG'
                              ? 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300'
                              : questionStatus === 'CORRECT'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                                : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-brand-200 hover:bg-brand-50/50'
                        }`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            questionStatus === 'WRONG'
                              ? 'bg-orange-500'
                              : questionStatus === 'CORRECT'
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                          }`}
                        />
                        <span>第{index + 1} 题</span>
                        <span>
                          {questionStatus === 'WRONG'
                            ? '答错'
                            : questionStatus === 'CORRECT'
                              ? '答对'
                              : '待做'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {aiResult ? <CompactAiResult title={aiTitle} result={aiResult} loading={aiLoading} error="" /> : null}

              <Link
                href="/student"
                className="rounded-[1.2rem] border border-dashed border-brand-200 bg-white/70 px-4 py-3 text-center text-sm font-bold text-brand-700"
              >
                返回学习首页
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
