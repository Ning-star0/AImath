'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CompactAiResult } from '@/components/ai-qa/compact-ai-result';
import { PageShell } from '@/components/base/page-shell';
import { aiService } from '@/services/ai.service';
import { wrongbookService } from '@/services/wrongbook.service';
import type { WrongbookListResult, WrongbookStatsResult } from '@/types/api';

const practiceQueueStorageKey = 'student-practice-queue';

function buildAiQaQuery(questionStem: string, questionType?: string, options?: Array<{ label: string; value: string }> | null) {
  const query = new URLSearchParams({
    question: questionStem,
    source: 'wrongbook',
  });

  if (questionType) {
    query.set('questionType', questionType);
  }

  if (options?.length) {
    query.set(
      'options',
      options.map((option) => `${option.label}. ${option.value}`).join('\n'),
    );
  }

  return query.toString();
}

export default function WrongbookPage() {
  const router = useRouter();
  const [listData, setListData] = useState<WrongbookListResult | null>(null);
  const [stats, setStats] = useState<WrongbookStatsResult | null>(null);
  const [error, setError] = useState('');
  const [helperMessage, setHelperMessage] = useState('');
  const [grade, setGrade] = useState<number | undefined>(3);
  const [questionType, setQuestionType] = useState<string>('');
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [aiPanelTitle, setAiPanelTitle] = useState<Record<string, string>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [aiResults, setAiResults] = useState<Record<string, Awaited<ReturnType<typeof aiService.askQuestion>>>>({});

  useEffect(() => {
    const loadData = async () => {
      setError('');
      setHelperMessage('');

      try {
        const [list, statsResult] = await Promise.all([
          wrongbookService.getList({
            grade,
            questionType: questionType || undefined,
            unresolvedOnly: true,
          }),
          wrongbookService.getStats(),
        ]);
        setListData(list);
        setStats(statsResult);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '错题数据加载失败');
      }
    };

    void loadData();
  }, [grade, questionType]);

  const handleArchive = async (id: string) => {
    try {
      await wrongbookService.archive(id, '前端归档操作');
      const refreshed = await wrongbookService.getList({
        grade,
        questionType: questionType || undefined,
        unresolvedOnly: true,
      });
      const refreshedStats = await wrongbookService.getStats();
      setListData(refreshed);
      setStats(refreshedStats);
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : '归档失败，请稍后重试。',
      );
    }
  };

  const handleGoAiQa = (
    questionStem: string,
    wrongQuestionType?: string,
    options?: Array<{ label: string; value: string }> | null,
  ) => {
    router.push(
      `/student/ai-qa?${buildAiQaQuery(questionStem, wrongQuestionType, options)}`,
    );
  };

  const handleRetry = (questionId: string, targetGrade?: number) => {
    const query = new URLSearchParams({
      questionId,
      source: 'wrongbook',
    });

    if (targetGrade) {
      query.set('grade', String(targetGrade));
    }

    router.push(`/student/practice?${query.toString()}`);
  };

  const handleAiAssist = async (
    item: WrongbookListResult['list'][number],
    mode: 'WRONG_ANALYSIS' | 'GENERATE_SIMILAR',
    title: string,
  ) => {
    setAiLoadingId(item.id);
    setAiPanelTitle((current) => ({
      ...current,
      [item.id]: title,
    }));
    setAiErrors((current) => ({
      ...current,
      [item.id]: '',
    }));

    try {
      const composedQuestion = item.options?.length
        ? `${item.questionStem}\n${item.options
            .map((option) => `${option.label}. ${option.value}`)
            .join('\n')}`
        : item.questionStem;

      const response = await aiService.askQuestion({
        originalQuestion: composedQuestion,
        grade: item.grade,
        questionType: item.questionType,
        options:
          item.options?.map((option) => `${option.label}. ${option.value}`) ?? [],
        context: {
          mode,
          source: 'wrongbook-embedded-ai',
          wrongCount: item.wrongCount,
          latestWrongAnswer: item.lastWrongAnswer ?? '',
        },
      });

      setAiResults((current) => ({
        ...current,
        [item.id]: response,
      }));
    } catch (requestError) {
      setAiErrors((current) => ({
        ...current,
        [item.id]:
          requestError instanceof Error
            ? requestError.message
            : 'AI 辅助暂时不可用，请稍后再试。',
      }));
    } finally {
      setAiLoadingId(null);
    }
  };

  const handleAddSimilarToPractice = (question: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    const current = window.localStorage.getItem(practiceQueueStorageKey);
    const parsed = current ? (JSON.parse(current) as string[]) : [];
    const merged = Array.from(new Set([...parsed, question]));
    window.localStorage.setItem(practiceQueueStorageKey, JSON.stringify(merged));
    setHelperMessage('已加入今日练习清单，可以去练习页继续做。');
  };

  return (
    <PageShell
      title="错题本"
      description="这里像一本复习冒险册，专门收着还要再练一练的题。可以重练、问 AI，也可以慢慢把它们变成已掌握。"
    >
      <section className="mb-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(254,252,232,0.94),rgba(240,253,244,0.92))] p-6 shadow-card">
          <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-amber-100/70 blur-3xl" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
            复习冒险册
          </p>
          <h2 className="mt-3 text-2xl font-bold text-ink">把不会的题慢慢变成会做的题</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            每次回来看错题，都是在把以前不会的地方一点点补起来。你可以直接再练一次，也可以让 AI 老师帮你分析。
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,246,255,0.94),rgba(245,243,255,0.92))] p-6 shadow-card">
          <div className="pointer-events-none absolute -right-6 top-4 h-24 w-24 rounded-full bg-sky-100/70 blur-3xl" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
            复习小提示
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/85 px-4 py-4 shadow-sm">
              <p className="text-xl">🔁</p>
              <p className="mt-2 text-sm font-semibold text-ink">先重练</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">先自己再试一次</p>
            </div>
            <div className="rounded-2xl bg-white/85 px-4 py-4 shadow-sm">
              <p className="text-xl">🤖</p>
              <p className="mt-2 text-sm font-semibold text-ink">再问 AI</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">卡住时再找老师</p>
            </div>
            <div className="rounded-2xl bg-white/85 px-4 py-4 shadow-sm">
              <p className="text-xl">🌟</p>
              <p className="mt-2 text-sm font-semibold text-ink">练会就归档</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">看见自己的进步</p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {helperMessage ? (
        <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {helperMessage}
        </div>
      ) : null}

      {stats ? (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,251,235,0.94))] p-6 shadow-card">
            <p className="text-sm text-slate-500">总错题数</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stats.totalWrongQuestions}</p>
          </div>
          <div className="rounded-3xl border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(254,243,199,0.94))] p-6 shadow-card">
            <p className="text-sm text-slate-500">待巩固</p>
            <p className="mt-3 text-3xl font-bold text-amber-700">{stats.unresolvedCount}</p>
          </div>
          <div className="rounded-3xl border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(240,253,244,0.94))] p-6 shadow-card">
            <p className="text-sm text-slate-500">已掌握</p>
            <p className="mt-3 text-3xl font-bold text-emerald-700">{stats.resolvedCount}</p>
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-card">
        <h2 className="text-2xl font-bold text-ink">错题列表</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <select
            value={grade ?? ''}
            onChange={(event) =>
              setGrade(event.target.value ? Number(event.target.value) : undefined)
            }
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
          >
            <option value="">全部年级</option>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <option key={item} value={item}>
                {item} 年级
              </option>
            ))}
          </select>
          <select
            value={questionType}
            onChange={(event) => setQuestionType(event.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
          >
            <option value="">全部题型</option>
            <option value="SINGLE_CHOICE">单选题</option>
            <option value="MULTIPLE_CHOICE">多选题</option>
            <option value="FILL_BLANK">填空题</option>
            <option value="SHORT_ANSWER">简答题</option>
          </select>
        </div>
        <div className="mt-6 space-y-4">
          {listData?.list.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-slate-100 bg-[linear-gradient(135deg,rgba(248,250,252,0.92),rgba(255,255,255,0.92))] p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-ink">{item.questionTitle}</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">
                  已错 {item.wrongCount} 次
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    item.resolved
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {item.resolved ? '已掌握' : '待巩固'}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-700">{item.questionStem}</p>

              {item.options?.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {item.options.map((option) => (
                    <div
                      key={`${item.id}-${option.label}`}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                    >
                      {option.label}. {option.value}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                <span>知识点：{item.knowledgePoint?.name ?? '未分类'}</span>
                <span>题型：{item.questionType ?? '未知题型'}</span>
                <span>年级：{item.grade ?? '-'} 年级</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleRetry(item.questionId, item.grade)}
                  className="rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 shadow-sm"
                >
                  去重练
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleGoAiQa(item.questionStem, item.questionType, item.options)
                  }
                  className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm"
                >
                  去 AI 解答
                </button>
                <button
                  type="button"
                  onClick={() => void handleAiAssist(item, 'WRONG_ANALYSIS', 'AI 分析错因')}
                  className="rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm"
                >
                  AI 分析错因
                </button>
                <button
                  type="button"
                  onClick={() => void handleAiAssist(item, 'GENERATE_SIMILAR', 'AI 出相似题')}
                  className="rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm"
                >
                  AI 出相似题
                </button>
                <button
                  type="button"
                  onClick={() => void handleArchive(item.id)}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                >
                  归档
                </button>
              </div>

              <CompactAiResult
                title={aiPanelTitle[item.id] ?? 'AI 辅助'}
                result={aiResults[item.id] ?? null}
                loading={aiLoadingId === item.id}
                error={aiErrors[item.id]}
              />

              {aiResults[item.id]?.similarQuestions?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiResults[item.id].similarQuestions.map((question) => (
                    <button
                      key={`${item.id}-${question}`}
                      type="button"
                      onClick={() => handleAddSimilarToPractice(question)}
                      className="rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-medium text-brand-700"
                    >
                      加入练习：{question}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
