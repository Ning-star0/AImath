'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CompactAiResult } from '@/components/ai-qa/compact-ai-result';
import { PageShell } from '@/components/base/page-shell';
import { AdventureMapBoard } from '@/components/practice/adventure-map-board';
import { awardStars } from '@/lib/game-rewards';
import { authService } from '@/services/auth.service';
import { aiService } from '@/services/ai.service';
import { exerciseService } from '@/services/exercise.service';
import {
  questionService,
  type QuestionQuery,
} from '@/services/question.service';
import { reportService } from '@/services/report.service';
import { useUserStore } from '@/store/use-user-store';
import type {
  ExerciseSubmitResult,
  QuestionItem,
  ReportOverviewResult,
} from '@/types/api';

function sortQuestionsWithFocus(
  list: QuestionItem[],
  focusQuestionId: string | null,
) {
  if (!focusQuestionId) {
    return list;
  }

  return [...list].sort((left, right) => {
    if (left.id === focusQuestionId) {
      return -1;
    }
    if (right.id === focusQuestionId) {
      return 1;
    }
    return 0;
  });
}

function getLongestCorrectStreak(
  details: ExerciseSubmitResult['details'] | undefined,
) {
  if (!details?.length) {
    return 0;
  }

  let current = 0;
  let longest = 0;

  for (const detail of details) {
    if (detail.isCorrect) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

export default function StudentPracticePage() {
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const setSession = useUserStore((state) => state.setSession);
  const accessToken = useUserStore((state) => state.accessToken);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExerciseSubmitResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<QuestionQuery>({});
  const [report, setReport] = useState<ReportOverviewResult | null>(null);
  const [focusQuestionId, setFocusQuestionId] = useState<string | null>(null);
  const [aiLoadingQuestionId, setAiLoadingQuestionId] = useState<string | null>(null);
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [aiPanelTitle, setAiPanelTitle] = useState<Record<string, string>>({});
  const [aiResults, setAiResults] = useState<Record<string, Awaited<ReturnType<typeof aiService.askQuestion>>>>({});
  const [earnedStars, setEarnedStars] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState('warmup');
  const [mapTip, setMapTip] = useState('');
  const questionSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const queryGrade = params.get('grade');
    const questionId = params.get('questionId');

    if (queryGrade) {
      setFilters((prev) => ({
        ...prev,
        grade: Number(queryGrade),
      }));
    }

    if (questionId) {
      setFocusQuestionId(questionId);
    }
  }, []);

  useEffect(() => {
    const resolveGrade = async () => {
      if (!accessToken) {
        return;
      }

      try {
        const resolvedUser =
          currentUser ?? (await authService.getCurrentUser());

        if (!currentUser) {
          setSession(accessToken, resolvedUser);
        }

        const grade = resolvedUser.grade ?? resolvedUser.student?.grade ?? 3;
        setFilters((prev) => ({
          ...prev,
          grade: prev.grade ?? grade,
        }));
      } catch {
        setFilters((prev) => ({
          ...prev,
          grade: prev.grade ?? 3,
        }));
      }
    };

    void resolveGrade();
  }, [accessToken, currentUser, setSession]);

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      setError('');

      try {
        const [questionData, reportData] = await Promise.all([
          questionService.getQuestionList(filters),
          reportService.getOverview(),
        ]);

        setQuestions(questionData.list);
        setReport(reportData);
        setAnswers({});
        setResult(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '题目加载失败');
      } finally {
        setLoading(false);
      }
    };

    void loadQuestions();
  }, [filters]);

  const masteredQuestionIds = useMemo(
    () => new Set(report?.questionDrilldowns.correct.map((item) => item.questionId) ?? []),
    [report],
  );

  const pendingQuestions = useMemo(() => {
    const baseList = questions.filter(
      (item) => !masteredQuestionIds.has(item.id) || item.id === focusQuestionId,
    );
    return sortQuestionsWithFocus(baseList, focusQuestionId);
  }, [focusQuestionId, masteredQuestionIds, questions]);

  const masteredQuestions = useMemo(
    () => questions.filter((item) => masteredQuestionIds.has(item.id) && item.id !== focusQuestionId),
    [focusQuestionId, masteredQuestionIds, questions],
  );

  const resultDetailMap = useMemo(() => {
    const entries =
      result?.details?.map((detail) => [detail.questionId, detail] as const) ?? [];

    return new Map(entries);
  }, [result]);

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);

    try {
      const submittedAnswers = pendingQuestions
        .map((item) => ({
          questionId: item.id,
          answer: answers[item.id] ?? '',
        }))
        .filter((item) => item.answer.trim() !== '');

      if (submittedAnswers.length === 0) {
        setError('请先做至少 1 道题，再提交答案。');
        return;
      }

      const payload = {
        answers: submittedAnswers,
        context: {
          page: 'student-practice',
          selectedGrade: filters.grade,
        },
      };
      const response = await exerciseService.submit(payload);
      setResult(response);

      const longestStreak = getLongestCorrectStreak(response.details);
      const comboBonus =
        longestStreak >= 2 ? Math.min(3, longestStreak - 1) : 0;
      const stars =
        response.correctCount +
        comboBonus +
        (response.wrongCount === 0 && response.totalCount > 0 ? 2 : 0);
      const rewardState = awardStars(currentUser?.id, stars);
      setEarnedStars(stars);
      setTotalStars(rewardState.totalStars);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : '提交练习失败，请先完成注册并登录后再试。',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requestAiSupport = async (
    question: QuestionItem,
    mode: 'REVIEW_QUESTION' | 'GIVE_HINT' | 'REPHRASE_EXPLANATION',
    panelTitle: string,
  ) => {
    setAiLoadingQuestionId(question.id);
    setAiErrors((current) => ({
      ...current,
      [question.id]: '',
    }));
    setAiPanelTitle((current) => ({
      ...current,
      [question.id]: panelTitle,
    }));

    try {
      const composedQuestion = question.options?.length
        ? `${question.stem}\n${question.options
            .map((option) => `${option.label}. ${option.value}`)
            .join('\n')}`
        : question.stem;

      const response = await aiService.askQuestion({
        originalQuestion: composedQuestion,
        grade: question.grade,
        questionType: question.questionType,
        options:
          question.options?.map((option) => `${option.label}. ${option.value}`) ?? [],
        context: {
          mode,
          source: 'practice-embedded-ai',
          title: question.title,
          studentAnswer: answers[question.id] ?? '',
        },
      });

      setAiResults((current) => ({
        ...current,
        [question.id]: response,
      }));
    } catch (requestError) {
      setAiErrors((current) => ({
        ...current,
        [question.id]:
          requestError instanceof Error
            ? requestError.message
            : 'AI 辅助暂时不可用，请稍后再试。',
      }));
    } finally {
      setAiLoadingQuestionId(null);
    }
  };

  const handleSelectStage = (stage: {
    id: string;
    title: string;
    difficulty?: number;
  }) => {
    setSelectedStageId(stage.id);
    setFilters((prev) => ({
      ...prev,
      difficulty: stage.difficulty,
    }));
    setMapTip(`已进入“${stage.title}”，下面会切换到对应难度的题目。`);
    window.setTimeout(() => {
      questionSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);
  };

  return (
    <PageShell
      title="练习"
      description="欢迎来到今天的闯关练习场。先完成还没掌握的题，再把星星一点点攒起来。"
    >
      <section className="mb-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,253,244,0.96),rgba(239,246,255,0.92))] p-6 shadow-card">
          <div className="pointer-events-none absolute -left-6 top-6 h-24 w-24 rounded-full bg-brand-100/70 blur-3xl" />
          <button
            type="button"
            onClick={() => setMapOpen((current) => !current)}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm transition hover:-translate-y-0.5"
          >
            🧭 {mapOpen ? '收起冒险地图' : '打开冒险地图'}
          </button>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
            今天先挑战什么
          </p>
          <h2 className="mt-3 text-2xl font-bold text-ink">一步一步把题做会</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            这里会优先放今天还没完全掌握的题。先做会，再去看已掌握题目，你会更清楚自己进步了多少。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500">当前年级</p>
              <p className="mt-1 text-lg font-bold text-brand-700">
                {filters.grade ?? currentUser?.grade ?? currentUser?.student?.grade ?? 3} 年级
              </p>
            </div>
            <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500">待挑战题目</p>
              <p className="mt-1 text-lg font-bold text-violet-700">
                {pendingQuestions.length} 道
              </p>
            </div>
            <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500">已掌握题目</p>
              <p className="mt-1 text-lg font-bold text-emerald-700">
                {masteredQuestions.length} 道
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,245,255,0.96),rgba(239,246,255,0.92))] p-6 shadow-card">
          <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-violet-100/60 blur-3xl" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
            闯关奖励
          </p>
          <h2 className="mt-3 text-2xl font-bold text-ink">答对就能拿星星</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/85 px-4 py-4 shadow-sm">
              <p className="text-2xl">⭐</p>
              <p className="mt-2 text-sm font-semibold text-ink">每答对 1 题</p>
              <p className="mt-1 text-sm text-violet-700">+1 星星</p>
            </div>
            <div className="rounded-2xl bg-white/85 px-4 py-4 shadow-sm">
              <p className="text-2xl">🔥</p>
              <p className="mt-2 text-sm font-semibold text-ink">连对奖励</p>
              <p className="mt-1 text-sm text-violet-700">连对越多，多加 1~3 星</p>
            </div>
            <div className="rounded-2xl bg-white/85 px-4 py-4 shadow-sm">
              <p className="text-2xl">🎯</p>
              <p className="mt-2 text-sm font-semibold text-ink">一轮全对</p>
              <p className="mt-1 text-sm text-violet-700">额外 +2 星</p>
            </div>
          </div>
        </div>
      </section>

      {mapOpen ? (
        <div className="mb-6 space-y-4">
          {mapTip ? (
            <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 shadow-sm">
              {mapTip}
            </div>
          ) : null}
          <AdventureMapBoard
            grade={filters.grade ?? currentUser?.grade ?? currentUser?.student?.grade ?? 3}
            pendingCount={pendingQuestions.length}
            masteredCount={masteredQuestions.length}
            selectedStageId={selectedStageId}
            onSelectStage={handleSelectStage}
          />
        </div>
      ) : null}

      {result ? (
        <section className="sticky top-4 z-10 mb-6 rounded-3xl border border-brand-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(240,253,244,0.95),rgba(243,244,255,0.92))] p-4 shadow-card backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              这一轮练习完成啦
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
              总题数 {result.totalCount}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              答对 {result.correctCount}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
              答错 {result.wrongCount}
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
              正确率 {result.accuracyRate}%
            </span>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700">
              +{earnedStars} ⭐
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-violet-700">
              现在共有 {totalStars} ⭐
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {result.wrongCount === 0
              ? '太棒了，这一轮全对，还拿到了额外的闯关奖励！'
              : '答对的题越多、连对越稳，得到的星星就会越多。'}
          </p>
        </section>
      ) : null}

      <section
        ref={questionSectionRef}
        className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-card"
      >
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.grade ?? currentUser?.grade ?? currentUser?.student?.grade ?? 3}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                grade: Number(event.target.value),
              }))
            }
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
          >
            {[1, 2, 3, 4, 5, 6].map((grade) => (
              <option key={grade} value={grade}>
                {grade} 年级
              </option>
            ))}
          </select>
          <select
            value={filters.difficulty ?? ''}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                difficulty: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              }))
            }
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
          >
            <option value="">全部难度</option>
            {[1, 2, 3, 4, 5].map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                难度 {difficulty}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-5">
          {loading ? <p className="text-sm text-slate-500">题目加载中...</p> : null}

          {!loading && pendingQuestions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
              <p className="text-lg font-semibold text-ink">
                这一页暂时没有新题啦
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                {questions.length === 0
                  ? `你现在选择的是 ${filters.grade} 年级。请先到管理端导入这个年级的题目。`
                  : '这个年级的题你最近都答对了，可以先去错题本复习，或者切换其他年级继续练习。'}
              </p>
            </div>
          ) : null}

          {pendingQuestions.length > 0 ? (
            <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-700 shadow-sm">
              这里优先放的是今天还没完全掌握的题。已经做对的题，会放到下面的“已掌握题目”里。
            </div>
          ) : null}

          {pendingQuestions.length > 0 ? (
            <div className="rounded-[1.5rem] border border-violet-100 bg-[linear-gradient(135deg,rgba(245,243,255,0.94),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-violet-700 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">本轮闯关进度</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700">
                  第 1 - {pendingQuestions.length} 题
                </span>
              </div>
              <p className="mt-2 leading-6">
                每答对 1 题可获得 1 颗星星；连对会额外加星，全部答对还能再拿 2 颗奖励星星。
              </p>
            </div>
          ) : null}

          {pendingQuestions.map((item, index) => (
            <article
              key={item.id}
              className={`rounded-3xl border p-5 shadow-sm ${
                item.id === focusQuestionId
                  ? 'border-brand-300 bg-[linear-gradient(135deg,rgba(240,253,244,0.94),rgba(255,255,255,0.92))]'
                  : 'border-slate-100 bg-[linear-gradient(135deg,rgba(248,250,252,0.92),rgba(255,255,255,0.92))]'
              }`}
            >
              {(() => {
                const detail = resultDetailMap.get(item.id);

                return (
                  <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-ink">
                  {index + 1}. {item.title}
                </h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">
                  {item.grade} 年级
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">
                  难度 {item.difficulty}
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  先做这题
                </span>
                {detail ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      detail.isCorrect
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {detail.isCorrect ? '这题做对了' : '这题还要再练'}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-700">{item.stem}</p>

              {item.options?.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {item.options.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [item.id]: option.label }))
                      }
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        answers[item.id] === option.label
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {option.label}. {option.value}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[item.id] ?? ''}
                  onChange={(event) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [item.id]: event.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500"
                  placeholder="请输入你的答案"
                />
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void requestAiSupport(item, 'REVIEW_QUESTION', 'AI 审题')}
                  className="rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 shadow-sm"
                >
                  AI 审题
                </button>
                <button
                  type="button"
                  onClick={() => void requestAiSupport(item, 'GIVE_HINT', '提示一步')}
                  className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm"
                >
                  提示一步
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void requestAiSupport(item, 'REPHRASE_EXPLANATION', '换种讲法')
                  }
                  className="rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm"
                >
                  换种讲法
                </button>
              </div>

              {detail ? (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-4 ${
                    detail.isCorrect
                      ? 'border-emerald-100 bg-emerald-50/80'
                      : 'border-red-100 bg-red-50/80'
                  }`}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/90 px-4 py-3">
                      <p className="text-xs text-slate-400">你的答案</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {detail.studentAnswer || '未填写'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/90 px-4 py-3">
                      <p className="text-xs text-slate-400">正确答案</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {detail.correctAnswer || '暂无'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/90 px-4 py-3">
                      <p className="text-xs text-slate-400">判题结果</p>
                      <p
                        className={`mt-1 text-sm font-semibold ${
                          detail.isCorrect ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {detail.isCorrect ? '你答对了' : '这次还没答对'}
                      </p>
                    </div>
                  </div>

                  {detail.feedback ? (
                    <div className="mt-3 rounded-2xl bg-white/90 px-4 py-3 text-sm leading-7 text-slate-600">
                      {detail.feedback}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <CompactAiResult
                title={aiPanelTitle[item.id] ?? 'AI 辅助'}
                result={aiResults[item.id] ?? null}
                loading={aiLoadingQuestionId === item.id}
                error={aiErrors[item.id]}
              />
                  </>
                );
              })()}
            </article>
          ))}
        </div>

        {masteredQuestions.length > 0 ? (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">已掌握题目</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                {masteredQuestions.length} 道
              </span>
            </div>
            <div className="space-y-3">
              {masteredQuestions.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-slate-100 bg-[linear-gradient(135deg,rgba(240,253,244,0.76),rgba(255,255,255,0.78))] p-5 opacity-90 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                      已掌握
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.stem}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || pendingQuestions.length === 0}
            className="rounded-2xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submitting ? '提交中...' : '提交答案'}
          </button>
          <p className="text-sm leading-6 text-slate-500">
            只会统计你已经填写答案的题，没写的题不会拉低正确率。
          </p>
        </div>
      </section>

    </PageShell>
  );
}
