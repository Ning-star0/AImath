'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CompactAiResult } from '@/components/ai-qa/compact-ai-result';
import { PageShell } from '@/components/base/page-shell';
import { EinsteinTipCard } from '@/components/brand/einstein-tip-card';
import {
  AuthRequiredState,
  NetworkErrorState,
  NoWrongQuestionsState,
  PageLoadErrorState,
  SessionExpiredState,
} from '@/components/states/platform-states';
import { getPlatformErrorKind } from '@/lib/platform-errors';
import { aiService } from '@/services/ai.service';
import { wrongbookService } from '@/services/wrongbook.service';
import { useUserStore } from '@/store/use-user-store';
import type { WrongQuestionItem, WrongbookListResult, WrongbookStatsResult } from '@/types/api';

function getStatusCopy(item: WrongQuestionItem) {
  if (item.resolved) {
    return { label: '已掌握', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }

  if ((item.wrongCount ?? 0) >= 3) {
    return { label: '重点复习', tone: 'bg-red-50 text-red-700 border-red-200' };
  }

  return { label: '待复习', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
}

function getPreferredGrade(currentUser: ReturnType<typeof useUserStore.getState>['currentUser']) {
  return currentUser?.grade ?? currentUser?.student?.grade ?? undefined;
}

export default function WrongbookPage() {
  const router = useRouter();
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);

  const [listData, setListData] = useState<WrongbookListResult | null>(null);
  const [stats, setStats] = useState<WrongbookStatsResult | null>(null);
  const [error, setError] = useState('');
  const [helperMessage, setHelperMessage] = useState('');
  const [grade, setGrade] = useState<number | undefined>(undefined);
  const [questionType, setQuestionType] = useState<string>('');
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [aiPanelTitle, setAiPanelTitle] = useState<Record<string, string>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [aiResults, setAiResults] = useState<Record<string, Awaited<ReturnType<typeof aiService.askQuestion>>>>({});

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (grade !== undefined) {
      return;
    }

    const preferredGrade = getPreferredGrade(currentUser);
    if (preferredGrade) {
      setGrade(preferredGrade);
    }
  }, [currentUser, grade]);

  const loadData = async () => {
    setError('');

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
      setError(loadError instanceof Error ? loadError.message : '错题数据加载失败，请稍后重试。');
    }
  };

  useEffect(() => {
    if (!accessToken && !currentUser) {
      return;
    }

    void loadData();
  }, [accessToken, currentUser, grade, questionType]);

  const urgentCount = useMemo(
    () => listData?.list.filter((item) => !item.resolved && (item.wrongCount ?? 0) >= 3).length ?? 0,
    [listData],
  );

  const handleArchive = async (id: string) => {
    try {
      await wrongbookService.archive(id, '前端归档操作');
      setHelperMessage('这道错题已归档。');
      await loadData();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : '归档失败，请稍后重试。');
    }
  };

  const handleRetry = (questionId: string, targetGrade?: number) => {
    const query = new URLSearchParams({ questionId, source: 'wrongbook' });
    if (targetGrade) {
      query.set('grade', String(targetGrade));
    }
    router.push(`/student/practice?${query.toString()}`);
  };

  const handleAiAssist = async (
    item: WrongQuestionItem,
    mode: 'WRONG_ANALYSIS' | 'GENERATE_SIMILAR',
    title: string,
  ) => {
    setAiLoadingId(item.id);
    setAiPanelTitle((current) => ({ ...current, [item.id]: title }));
    setAiErrors((current) => ({ ...current, [item.id]: '' }));

    try {
      const composedQuestion = item.options?.length
        ? `${item.questionStem}\n${item.options.map((option) => `${option.label}. ${option.value}`).join('\n')}`
        : item.questionStem;

      const response = await aiService.askQuestion({
        originalQuestion: composedQuestion,
        grade: item.grade,
        questionType: item.questionType,
        options: item.options?.map((option) => `${option.label}. ${option.value}`) ?? [],
        context: {
          mode,
          source: 'wrongbook-page',
          wrongCount: item.wrongCount,
          latestWrongAnswer: item.lastWrongAnswer ?? '',
        },
      });

      setAiResults((current) => ({ ...current, [item.id]: response }));
    } catch (requestError) {
      setAiErrors((current) => ({
        ...current,
        [item.id]: requestError instanceof Error ? requestError.message : 'AI 辅助暂时不可用，请稍后重试。',
      }));
    } finally {
      setAiLoadingId(null);
    }
  };

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="错题本" description="集中复习做错的题目，先处理最需要回看的内容。">
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (error && !listData) {
    const errorKind = getPlatformErrorKind(error);

    return (
      <PageShell title="错题本" description="集中复习做错的题目，先处理最需要回看的内容。">
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

  if (listData && listData.list.length === 0) {
    return (
      <PageShell title="错题本" description="集中复习做错的题目，先处理最需要回看的内容。">
        <NoWrongQuestionsState />
      </PageShell>
    );
  }

  return (
    <PageShell title="错题本" description="这里只保留筛选、复习入口和 AI 分析，不再堆很多说明。">
      {helperMessage ? (
        <div className="mb-4 rounded-[1.2rem] bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 shadow-sm">
          {helperMessage}
        </div>
      ) : null}

      <section className="portal-board px-5 py-5 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="grid gap-4">
            <div className="rounded-[2rem] border border-[#F6D36A] bg-[linear-gradient(180deg,#FFFDF3,#FFFFFF)] px-5 py-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="math-chip math-chip-warm">专项复习</span>
                <span className="math-chip math-chip-primary">错题本</span>
              </div>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">先处理最需要回看的错题</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                答错后系统会自动写入错题本。这里显示的是当前账号还未解决、且未归档的错题。
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="math-stat-card px-4 py-4 text-center">
                  <p className="text-sm text-slate-500">待复习</p>
                  <p className="mt-2 text-3xl font-extrabold text-amber-600">{stats?.unresolvedCount ?? 0}</p>
                </div>
                <div className="math-stat-card px-4 py-4 text-center">
                  <p className="text-sm text-slate-500">重点复习</p>
                  <p className="mt-2 text-3xl font-extrabold text-red-600">{urgentCount}</p>
                </div>
                <div className="math-stat-card px-4 py-4 text-center">
                  <p className="text-sm text-slate-500">已掌握</p>
                  <p className="mt-2 text-3xl font-extrabold text-emerald-600">{stats?.resolvedCount ?? 0}</p>
                </div>
              </div>
            </div>

            <EinsteinTipCard
              message="如果你刚做错了题，这里没有显示，先检查当前筛选年级和题型是不是把它过滤掉了。"
              tone="yellow"
            />

            <div className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-600">
                  年级
                  <select
                    value={grade ?? ''}
                    onChange={(event) => setGrade(event.target.value ? Number(event.target.value) : undefined)}
                    className="rounded-[1rem] border border-slate-200 px-3 py-3 outline-none focus:border-brand-300"
                  >
                    <option value="">全部年级</option>
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                      <option key={item} value={item}>
                        {item} 年级
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-600">
                  题型
                  <select
                    value={questionType}
                    onChange={(event) => setQuestionType(event.target.value)}
                    className="rounded-[1rem] border border-slate-200 px-3 py-3 outline-none focus:border-brand-300"
                  >
                    <option value="">全部题型</option>
                    <option value="SINGLE_CHOICE">单选题</option>
                    <option value="MULTIPLE_CHOICE">多选题</option>
                    <option value="FILL_BLANK">填空题</option>
                    <option value="SHORT_ANSWER">解答题</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {listData?.list.map((item) => {
              const status = getStatusCopy(item);

              return (
                <div key={item.id} className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${status.tone}`}>{status.label}</span>
                    <span className="text-xs font-bold text-slate-500">答错 {item.wrongCount} 次</span>
                  </div>

                  <p className="mt-3 text-sm font-bold text-slate-500">
                    {item.knowledgePoint?.name ?? '知识点待补充'}
                  </p>
                  <p className="mt-2 text-base font-semibold leading-7 text-ink">{item.questionStem}</p>

                  {item.lastWrongAnswer ? (
                    <p className="mt-3 text-sm text-slate-500">最近一次错误答案：{item.lastWrongAnswer}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleRetry(item.questionId, item.grade)}
                      className="math-button-primary rounded-[0.95rem] px-4 py-2 text-xs font-extrabold text-white"
                    >
                      再练一次
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAiAssist(item, 'WRONG_ANALYSIS', 'AI 错因分析')}
                      className="math-button-secondary rounded-[0.95rem] px-4 py-2 text-xs font-extrabold text-slate-700"
                    >
                      AI 错因分析
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAiAssist(item, 'GENERATE_SIMILAR', 'AI 生成相似题')}
                      className="math-button-secondary rounded-[0.95rem] px-4 py-2 text-xs font-extrabold text-slate-700"
                    >
                      相似题
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleArchive(item.id)}
                      className="rounded-[0.95rem] border border-slate-200 px-4 py-2 text-xs font-extrabold text-slate-500"
                    >
                      归档
                    </button>
                  </div>

                  {aiErrors[item.id] ? <p className="mt-3 text-sm text-red-600">{aiErrors[item.id]}</p> : null}
                  {aiResults[item.id] ? (
                    <div className="mt-4">
                      <CompactAiResult
                        title={aiPanelTitle[item.id] ?? 'AI 辅助'}
                        result={aiResults[item.id]}
                        loading={aiLoadingId === item.id}
                        error={aiErrors[item.id] ?? ''}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
