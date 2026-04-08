'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
import { CompactAiResult } from '@/components/ai-qa/compact-ai-result';
import { PageShell } from '@/components/base/page-shell';
import { aiService } from '@/services/ai.service';
import { wrongbookService } from '@/services/wrongbook.service';
import type { WrongbookListResult, WrongbookStatsResult } from '@/types/api';

const practiceQueueStorageKey = 'student-practice-queue';

function buildAiQaQuery(
  questionStem: string,
  questionType?: string,
  options?: Array<{ label: string; value: string }> | null,
) {
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

function getStatusCopy(item: WrongbookListResult['list'][number]) {
  if (item.resolved) {
    return {
      label: '已掌握',
      tone: 'bg-emerald-50 text-emerald-700',
      description: '最近复习已经通过，可以归档或偶尔回看。',
    };
  }

  if ((item.wrongCount ?? 0) >= 3) {
    return {
      label: '重点复习',
      tone: 'bg-red-50 text-red-700',
      description: '这道题反复出错，建议先看错因再做相似题。',
    };
  }

  return {
    label: '待复习',
    tone: 'bg-amber-50 text-amber-700',
    description: '建议尽快重新练习，趁还记得题意时补上。',
  };
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
        setError(loadError instanceof Error ? loadError.message : '错题数据加载失败。');
      }
    };

    void loadData();
  }, [grade, questionType]);

  const filteredTotal = listData?.list.length ?? 0;
  const urgentCount = useMemo(
    () => listData?.list.filter((item) => !item.resolved && (item.wrongCount ?? 0) >= 3).length ?? 0,
    [listData],
  );

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
      setHelperMessage('这道题已归档。如果之后还想回顾，也可以再重新加入复习。');
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
    setHelperMessage('相似题已经加入练习清单，可以去练习页继续专项练习。');
  };

  return (
    <PageShell
      title="错题诊所"
      description="这里是你的专项复习中心。错题会被清楚整理出来，帮助你不害怕错题，而是把不会的地方一题题补会。"
    >
      <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="math-chip math-chip-warm">专项复习中心</span>
                <span className="math-chip math-chip-primary">错题诊所</span>
                <span className="math-chip math-chip-success">不怕错，重要的是学会</span>
              </div>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">
                把不会的题，一步步变成会做的题
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                错题本不是记录失败的地方，而是帮助你找出薄弱点、重新讲清楚、重新练扎实的复习中心。
              </p>
            </div>
            <div className="rounded-[1.8rem] bg-[linear-gradient(180deg,#FFF8E1,#FFF3E0)] p-3">
              <EinsteinMentor size="md" mood="focus" badge="复习" />
            </div>
          </div>

          {stats ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[1.4rem] bg-[#FFF3E0] px-4 py-5">
                <p className="text-sm font-semibold text-slate-500">总错题数</p>
                <p className="mt-2 font-math-display text-3xl font-extrabold text-[#EF6C00]">
                  {stats.totalWrongQuestions}
                </p>
              </article>
              <article className="rounded-[1.4rem] bg-[#FFF8E1] px-4 py-5">
                <p className="text-sm font-semibold text-slate-500">待复习</p>
                <p className="mt-2 font-math-display text-3xl font-extrabold text-[#B26A00]">
                  {stats.unresolvedCount}
                </p>
              </article>
              <article className="rounded-[1.4rem] bg-[#FDECEC] px-4 py-5">
                <p className="text-sm font-semibold text-slate-500">重点复习</p>
                <p className="mt-2 font-math-display text-3xl font-extrabold text-red-700">
                  {urgentCount}
                </p>
              </article>
              <article className="rounded-[1.4rem] bg-[#E8F5E9] px-4 py-5">
                <p className="text-sm font-semibold text-slate-500">已掌握</p>
                <p className="mt-2 font-math-display text-3xl font-extrabold text-[#2E7D32]">
                  {stats.resolvedCount}
                </p>
              </article>
            </div>
          ) : null}
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <h2 className="font-math-display text-3xl font-extrabold text-ink">复习路线</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-[1.4rem] bg-[#EEF1FF] px-4 py-4">
              <p className="text-xl font-black text-brand-700">1</p>
              <p className="mt-2 text-sm font-semibold text-ink">看清错题</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">先知道自己错在哪里</p>
            </div>
            <div className="rounded-[1.4rem] bg-[#E8F5E9] px-4 py-4">
              <p className="text-xl font-black text-[#2E7D32]">2</p>
              <p className="mt-2 text-sm font-semibold text-ink">问 AI</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">先分析错因再听讲解</p>
            </div>
            <div className="rounded-[1.4rem] bg-[#FFF3E0] px-4 py-4">
              <p className="text-xl font-black text-[#EF6C00]">3</p>
              <p className="mt-2 text-sm font-semibold text-ink">练相似题</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">把同类题做熟</p>
            </div>
            <div className="rounded-[1.4rem] bg-[#F3E8FF] px-4 py-4">
              <p className="text-xl font-black text-[#8E24AA]">4</p>
              <p className="mt-2 text-sm font-semibold text-ink">回归掌握</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">复习通过后再归档</p>
            </div>
          </div>
        </article>
      </section>

      {error ? (
        <div className="mt-6 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : null}

      {helperMessage ? (
        <div className="mt-6 rounded-[1.2rem] bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
          {helperMessage}
        </div>
      ) : null}

      <section className="mt-6 rounded-[2rem] bg-white/92 px-6 py-7 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">筛选与分组</p>
            <h2 className="font-math-display text-3xl font-extrabold text-ink">错题列表</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              你可以按年级和题型筛选，把复习任务拆得更清楚。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={grade ?? ''}
              onChange={(event) =>
                setGrade(event.target.value ? Number(event.target.value) : undefined)
              }
              className="math-input max-w-[8rem] py-2"
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
              className="math-input max-w-[10rem] py-2"
            >
              <option value="">全部题型</option>
              <option value="SINGLE_CHOICE">单选题</option>
              <option value="MULTIPLE_CHOICE">多选题</option>
              <option value="FILL_BLANK">填空题</option>
              <option value="SHORT_ANSWER">简答题</option>
            </select>
            <div className="rounded-full bg-[#EEF4FF] px-4 py-3 text-sm font-extrabold text-brand-700">
              当前筛选 {filteredTotal} 题
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {listData?.list.map((item) => {
            const status = getStatusCopy(item);

            return (
              <article
                key={item.id}
                className="rounded-[1.9rem] border border-slate-100 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(255,255,255,0.95))] p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-math-display text-2xl font-extrabold text-ink">
                        {item.questionTitle}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${status.tone}`}>
                        {status.label}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                        已错 {item.wrongCount} 次
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-7 text-slate-700">{item.questionStem}</p>

                    {item.options?.length ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {item.options.map((option) => (
                          <div
                            key={`${item.id}-${option.label}`}
                            className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          >
                            {option.label}. {option.value}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[1.1rem] bg-[#FFF8E1] px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                          最近答错情况
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {item.lastWrongAnswer ? `你上次答：${item.lastWrongAnswer}` : '暂无最近答错答案'}
                        </p>
                      </div>
                      <div className="rounded-[1.1rem] bg-[#EEF4FF] px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                          题型
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {item.questionType ?? '未知题型'}
                        </p>
                      </div>
                      <div className="rounded-[1.1rem] bg-[#E8F5E9] px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                          年级
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {item.grade ?? '-'} 年级
                        </p>
                      </div>
                      <div className="rounded-[1.1rem] bg-[#F3E8FF] px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                          知识点
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {item.knowledgePoint?.name ?? '未分类'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[1.2rem] bg-slate-50/90 px-4 py-4">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        复习建议
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {status.description}
                      </p>
                    </div>
                  </div>

                  <div className="w-full rounded-[1.4rem] bg-white/90 p-4 shadow-[0_12px_24px_rgba(63,81,181,0.08)] lg:w-[270px]">
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-700">
                      复习操作
                    </p>
                    <div className="mt-4 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => handleRetry(item.questionId, item.grade)}
                        className="math-button-primary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-white"
                      >
                        重新加入练习
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleGoAiQa(item.questionStem, item.questionType, item.options)
                        }
                        className="math-button-secondary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-[#2E7D32]"
                      >
                        去 AI 解答
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAiAssist(item, 'WRONG_ANALYSIS', 'AI 错因分析')}
                        className="math-button-secondary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-red-700"
                      >
                        AI 错因分析
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAiAssist(item, 'GENERATE_SIMILAR', 'AI 相似题练习')}
                        className="math-button-secondary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-[#1565C0]"
                      >
                        AI 生成相似题
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleArchive(item.id)}
                        className="math-button-secondary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700"
                      >
                        归档这道题
                      </button>
                    </div>
                  </div>
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
                        className="rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-black text-brand-700"
                      >
                        加入练习：{question}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
