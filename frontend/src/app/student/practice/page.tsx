'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
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
  const [mapOpen, setMapOpen] = useState(true);
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
        const resolvedUser = currentUser ?? (await authService.getCurrentUser());

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
        setError(loadError instanceof Error ? loadError.message : '题目加载失败。');
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
        setError('请先完成至少 1 道题，再提交答案。');
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
          : '提交练习失败，请稍后重试。',
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

  const grade = filters.grade ?? currentUser?.grade ?? currentUser?.student?.grade ?? 3;
  const completionRate =
    pendingQuestions.length + masteredQuestions.length === 0
      ? 0
      : Math.round(
          (masteredQuestions.length /
            (pendingQuestions.length + masteredQuestions.length)) *
            100,
        );
  const activeQuestion = pendingQuestions[0] ?? null;
  const answeredCount = pendingQuestions.filter(
    (item) => (answers[item.id] ?? '').trim() !== '',
  ).length;

  return (
    <PageShell
      title="智能练习"
      description="这里是你的数学闯关中心。先完成今天还没掌握的题，再用 AI 帮助自己把难点一题题讲明白。"
    >
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="math-chip math-chip-primary">数学地图</span>
                <span className="math-chip math-chip-success">当前年级 {grade}</span>
                <span className="math-chip math-chip-warm">练习聚焦模式</span>
              </div>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">
                今天先把还没掌握的题做会
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                练习页不只是题目列表。这里会优先展示你还没完全掌握的题，并给你地图闯关、即时判题和 AI 辅助。
              </p>
            </div>
            <div className="rounded-[1.8rem] bg-[linear-gradient(180deg,#F8FBFF,#EEF4FF)] p-3">
              <EinsteinMentor size="md" mood="celebrate" badge="闯关" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[1.4rem] bg-[#EEF1FF] px-4 py-5">
              <p className="text-sm font-semibold text-slate-500">待挑战题目</p>
              <p className="mt-2 font-math-display text-3xl font-extrabold text-brand-700">
                {pendingQuestions.length}
              </p>
            </article>
            <article className="rounded-[1.4rem] bg-[#E8F5E9] px-4 py-5">
              <p className="text-sm font-semibold text-slate-500">已掌握题目</p>
              <p className="mt-2 font-math-display text-3xl font-extrabold text-[#2E7D32]">
                {masteredQuestions.length}
              </p>
            </article>
            <article className="rounded-[1.4rem] bg-[#FFF3E0] px-4 py-5">
              <p className="text-sm font-semibold text-slate-500">掌握进度</p>
              <p className="mt-2 font-math-display text-3xl font-extrabold text-[#EF6C00]">
                {completionRate}%
              </p>
            </article>
            <article className="rounded-[1.4rem] bg-[#F3E8FF] px-4 py-5">
              <p className="text-sm font-semibold text-slate-500">AI 辅助</p>
              <p className="mt-2 font-math-display text-3xl font-extrabold text-[#8E24AA]">
                3种
              </p>
            </article>
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">闯关奖励</p>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">答对就能拿星星</h2>
            </div>
            <button
              type="button"
              onClick={() => setMapOpen((current) => !current)}
              className="math-button-secondary rounded-[1rem] px-4 py-2 text-sm font-extrabold text-slate-700"
            >
              {mapOpen ? '收起地图' : '打开地图'}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] bg-[#FFF8E1] px-4 py-4">
              <p className="text-2xl">★</p>
              <p className="mt-2 text-sm font-semibold text-ink">每答对 1 题</p>
              <p className="mt-1 text-sm text-[#EF6C00]">+1 星星</p>
            </div>
            <div className="rounded-[1.4rem] bg-[#EEF1FF] px-4 py-4">
              <p className="text-2xl">✦</p>
              <p className="mt-2 text-sm font-semibold text-ink">连对奖励</p>
              <p className="mt-1 text-sm text-brand-700">连续答对可额外加星</p>
            </div>
            <div className="rounded-[1.4rem] bg-[#E8F5E9] px-4 py-4">
              <p className="text-2xl">✓</p>
              <p className="mt-2 text-sm font-semibold text-ink">全对加成</p>
              <p className="mt-1 text-sm text-[#2E7D32]">一轮全对额外奖励</p>
            </div>
          </div>

          {result ? (
            <div className="mt-5 rounded-[1.5rem] border border-brand-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(238,241,255,0.95),rgba(232,245,233,0.92))] px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="math-chip math-chip-primary">本轮完成</span>
                <span className="math-chip math-chip-success">答对 {result.correctCount}</span>
                <span className="math-chip math-chip-warm">答错 {result.wrongCount}</span>
                <span className="math-chip math-chip-violet">+{earnedStars} 星</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                当前正确率 {result.accuracyRate}% ，累计星星 {totalStars}。做对的题会进入“已掌握”，做错的题会自动沉淀到错题本。
              </p>
            </div>
          ) : null}
        </article>
      </section>

      {mapOpen ? (
        <section className="mt-6 space-y-4">
          {mapTip ? (
            <div className="rounded-[1.2rem] bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
              {mapTip}
            </div>
          ) : null}
          <AdventureMapBoard
            grade={grade}
            pendingCount={pendingQuestions.length}
            masteredCount={masteredQuestions.length}
            selectedStageId={selectedStageId}
            onSelectStage={handleSelectStage}
          />
        </section>
      ) : null}

      {activeQuestion ? (
        <section className="mt-6 math-card rounded-[2rem] px-6 py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="math-chip math-chip-primary">当前闯关焦点</span>
                <span className="math-chip math-chip-success">
                  第 1 / {pendingQuestions.length} 题
                </span>
              </div>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">
                先把这道题做明白
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                当前优先题是“{activeQuestion.title}”。先自己想一想，再用 AI 的审题、提示一步或换种讲法来帮忙。
              </p>
            </div>

            <div className="min-w-[220px] rounded-[1.5rem] bg-[linear-gradient(180deg,#EEF4FF,#FFFFFF)] px-5 py-4">
              <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-brand-700">
                <span>本轮进度</span>
                <span>{answeredCount}/{pendingQuestions.length}</span>
              </div>
              <div className="h-3 rounded-full bg-brand-100">
                <div
                  className="h-3 rounded-full bg-brand-700 transition-all"
                  style={{
                    width: `${
                      pendingQuestions.length === 0
                        ? 0
                        : Math.max(
                            6,
                            Math.round((answeredCount / pendingQuestions.length) * 100),
                          )
                    }%`,
                  }}
                />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-600">
                已填写 {answeredCount} 题，先完成当前这一轮再提交。
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section
        ref={questionSectionRef}
        className="mt-6 rounded-[2rem] bg-white/92 px-6 py-7 shadow-card"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">做题区</p>
            <h2 className="font-math-display text-3xl font-extrabold text-ink">当前练习任务</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              题目区会优先聚焦正在练的内容。每道题都能直接获得 AI 审题、提示一步和换种讲法。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={grade}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  grade: Number(event.target.value),
                }))
              }
              className="math-input max-w-[8rem] py-2"
            >
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <option key={item} value={item}>
                  {item} 年级
                </option>
              ))}
            </select>
            <select
              value={filters.difficulty ?? ''}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  difficulty: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
              className="math-input max-w-[9rem] py-2"
            >
              <option value="">全部难度</option>
              {[1, 2, 3, 4, 5].map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  难度 {difficulty}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        ) : null}

        {pendingQuestions.length > 0 ? (
          <div className="mt-5 rounded-[1.4rem] bg-[#EEF1FF] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-brand-700">本轮题目进度</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-brand-700">
                1 / {pendingQuestions.length}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              只统计你已经填写答案的题，空白题不会拉低本轮正确率。
            </p>
          </div>
        ) : null}

        <div className="mt-6 space-y-5">
          {loading ? <p className="text-sm text-slate-500">题目加载中...</p> : null}

          {!loading && pendingQuestions.length === 0 ? (
            <div className="rounded-[1.6rem] border border-dashed border-brand-200 bg-[#F8FBFF] px-6 py-10 text-center">
              <p className="font-math-display text-2xl font-extrabold text-ink">这一页暂时没有新题啦</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {questions.length === 0
                  ? `你现在选择的是 ${grade} 年级。请先导入这个年级的题目。`
                  : '这个年级的题你最近都做对了，可以先去错题本复习，或者切换其他难度继续闯关。'}
              </p>
            </div>
          ) : null}

          {pendingQuestions.map((item, index) => {
            const detail = resultDetailMap.get(item.id);
            const isCurrentFocus = index === 0;

            return (
              <article
                key={item.id}
                className={`rounded-[1.9rem] border p-5 shadow-sm ${
                  item.id === focusQuestionId || isCurrentFocus
                    ? 'border-brand-300 bg-[linear-gradient(135deg,rgba(238,241,255,0.98),rgba(255,255,255,0.96))] shadow-[0_20px_36px_rgba(63,81,181,0.14)]'
                    : 'border-slate-100 bg-[linear-gradient(135deg,rgba(248,250,252,0.94),rgba(255,255,255,0.94))]'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
                    第 {index + 1} 题
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                    {item.grade} 年级
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                    难度 {item.difficulty}
                  </span>
                  {isCurrentFocus ? (
                    <span className="rounded-full bg-[#FFF8E1] px-3 py-1 text-xs font-black text-[#B26A00]">
                      当前主做题
                    </span>
                  ) : null}
                  {detail ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        detail.isCorrect
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {detail.isCorrect ? '这题做对了' : '这题还要再练'}
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-4 font-math-display text-2xl font-extrabold text-ink">
                  {item.title}
                </h3>
                <div className="mt-4 rounded-[1.4rem] bg-white/86 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">题目阅读区</p>
                  <p className="mt-3 text-base leading-8 text-slate-700">{item.stem}</p>
                </div>

                {item.options?.length ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {item.options.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [item.id]: option.label }))
                        }
                        className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm font-semibold transition ${
                          answers[item.id] === option.label
                            ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-[0_12px_20px_rgba(63,81,181,0.12)]'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200'
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
                    className="math-input mt-5"
                    placeholder="请输入你的答案"
                  />
                )}

                <div className="mt-5 rounded-[1.3rem] bg-[linear-gradient(180deg,#EEF4FF,#FFFFFF)] px-4 py-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-700">
                      AI 辅助工具
                    </p>
                    <span className="text-xs font-semibold text-slate-500">
                      卡住时再点，会更有帮助
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void requestAiSupport(item, 'REVIEW_QUESTION', 'AI 审题帮助')}
                    className="math-button-secondary rounded-full px-4 py-2 text-sm font-extrabold text-brand-700"
                  >
                    AI 审题
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestAiSupport(item, 'GIVE_HINT', '提示一步')}
                    className="math-button-secondary rounded-full px-4 py-2 text-sm font-extrabold text-[#2E7D32]"
                  >
                    提示一步
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void requestAiSupport(item, 'REPHRASE_EXPLANATION', '换种讲法')
                    }
                    className="math-button-secondary rounded-full px-4 py-2 text-sm font-extrabold text-[#1565C0]"
                  >
                    换种讲法
                  </button>
                  </div>
                </div>

                {detail ? (
                  <div
                    className={`mt-5 rounded-[1.4rem] border px-4 py-4 ${
                      detail.isCorrect
                        ? 'border-emerald-100 bg-emerald-50/80'
                        : 'border-red-100 bg-red-50/80'
                    }`}
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1rem] bg-white/92 px-4 py-3">
                        <p className="text-xs font-semibold text-slate-400">你的答案</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {detail.studentAnswer || '未填写'}
                        </p>
                      </div>
                      <div className="rounded-[1rem] bg-white/92 px-4 py-3">
                        <p className="text-xs font-semibold text-slate-400">正确答案</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {detail.correctAnswer || '暂无'}
                        </p>
                      </div>
                      <div className="rounded-[1rem] bg-white/92 px-4 py-3">
                        <p className="text-xs font-semibold text-slate-400">判题结果</p>
                        <p
                          className={`mt-1 text-sm font-extrabold ${
                            detail.isCorrect ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {detail.isCorrect ? '你答对了' : '这题需要再巩固'}
                        </p>
                      </div>
                    </div>

                    {detail.feedback ? (
                      <div className="mt-3 rounded-[1rem] bg-white/92 px-4 py-3 text-sm leading-7 text-slate-600">
                        <p className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          讲解反馈
                        </p>
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
              </article>
            );
          })}
        </div>

        {masteredQuestions.length > 0 ? (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-math-display text-2xl font-extrabold text-ink">已掌握题目</h2>
              <span className="math-chip math-chip-success">{masteredQuestions.length} 题</span>
            </div>
            <div className="space-y-3">
              {masteredQuestions.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-slate-100 bg-[linear-gradient(135deg,rgba(232,245,233,0.86),rgba(255,255,255,0.88))] p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink">{item.title}</h3>
                    <span className="math-chip math-chip-success">已掌握</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.stem}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || pendingQuestions.length === 0}
            className="math-button-primary rounded-[1.1rem] px-6 py-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? '正在提交...' : '提交本轮答案'}
          </button>
          <p className="text-sm leading-6 text-slate-500">
            提交后会得到即时正误反馈、正确答案和讲解提示，并自动把错题沉淀到错题本。
          </p>
        </div>
      </section>
    </PageShell>
  );
}
