'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CompactAiResult } from '@/components/ai-qa/compact-ai-result';
import { EinsteinTipCard } from '@/components/brand/einstein-tip-card';
import { PageShell } from '@/components/base/page-shell';
import {
  AuthRequiredState,
  NetworkErrorState,
  NoLearningDataState,
  PageLoadErrorState,
  SessionExpiredState,
} from '@/components/states/platform-states';
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

export default function StudentPracticePage() {
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
  const [report, setReport] = useState<ReportOverviewResult | null>(null);
  const [statusMap, setStatusMap] = useState<Map<string, QuestionStatus>>(new Map());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTitle, setAiTitle] = useState('AI 辅助');
  const [aiResult, setAiResult] = useState<Awaited<ReturnType<typeof aiService.askQuestion>> | null>(null);
  const [pageTip, setPageTip] = useState('');
  const [pageTipTone, setPageTipTone] = useState<PageTipTone>('info');

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const loadData = async () => {
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
        const [questionData, reportData] = await Promise.all([
          questionService.getQuestionList({ grade }),
          reportService.getOverview(),
        ]);

        const nextStatusMap = buildStatusMap(reportData);
        setQuestions(questionData.list);
        setReport(reportData);
        setStatusMap(nextStatusMap);
        setActiveIndex((current) => {
          if (questionData.list.length === 0) {
            return 0;
          }
          return current < questionData.list.length ? current : getFirstPendingIndex(questionData.list, nextStatusMap);
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '练习题目加载失败，请稍后重试。');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [accessToken, currentUser, setSession]);

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

  const handleSelectQuestion = (index: number) => {
    setActiveIndex(index);
    setAiResult(null);
    setPageTip('');
    setPageTipTone('info');
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const refreshReportState = async (preserveIndex = activeIndex) => {
    const refreshedReport = await reportService.getOverview();
    const nextStatusMap = buildStatusMap(refreshedReport);
    setReport(refreshedReport);
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
        },
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
        setPageTip('这道题答对了。你可以继续下一题，也可以留在这里再检查一遍。');
        setPageTipTone('success');
      } else {
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

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="练习闯关" description="优先完成当前题目，再决定是否需要 AI 辅助。">
        <AuthRequiredState />
      </PageShell>
    );
  }

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
          className={`mb-4 rounded-[1.2rem] px-4 py-3 text-sm font-semibold shadow-sm ${
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

      <section className="portal-board px-5 py-5 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[2rem] border border-[#F6D36A] bg-[linear-gradient(180deg,#FFFDF3,#FFFFFF)] px-5 py-5">
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
              <div className="mt-4 flex flex-wrap gap-2">
                {questions.map((question, index) => {
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
      </section>
    </PageShell>
  );
}
