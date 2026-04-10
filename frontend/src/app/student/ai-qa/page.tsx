'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AnswerResultCard } from '@/components/ai-qa/answer-result-card';
import { QuestionInputCard } from '@/components/ai-qa/question-input-card';
import { EinsteinTipCard } from '@/components/brand/einstein-tip-card';
import { PageShell } from '@/components/base/page-shell';
import { AuthRequiredState } from '@/components/states/platform-states';
import { aiService } from '@/services/ai.service';
import { authService } from '@/services/auth.service';
import { useUserStore } from '@/store/use-user-store';
import type { AiQaResult } from '@/types/api';

interface AiQaFormValues {
  originalQuestion: string;
}

const practiceQueueStorageKey = 'student-practice-queue';

function buildPreviewLines(preview: string) {
  return preview
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeOptions(optionsText: string) {
  return optionsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildQuestionPayload(originalQuestion: string, questionType: string, options: string[]) {
  if ((questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && options.length > 0) {
    return `${originalQuestion}\n选项如下：\n${options.join('\n')}`;
  }

  return originalQuestion;
}

export default function StudentAiQaPage() {
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const accessToken = useUserStore((state) => state.accessToken);
  const setSession = useUserStore((state) => state.setSession);
  const [result, setResult] = useState<AiQaResult | null>(null);
  const [streamPreview, setStreamPreview] = useState('');
  const [streamStatus, setStreamStatus] = useState('准备开始讲题');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [questionType, setQuestionType] = useState('SHORT_ANSWER');
  const [optionsText, setOptionsText] = useState('');
  const [helperMessage, setHelperMessage] = useState('');

  const previewLines = useMemo(() => buildPreviewLines(streamPreview), [streamPreview]);

  const { watch, setValue, handleSubmit } = useForm<AiQaFormValues>({
    defaultValues: {
      originalQuestion: '',
    },
  });

  const originalQuestion = watch('originalQuestion');

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

  const onSubmit = handleSubmit(async (values) => {
    const normalizedOptions = normalizeOptions(optionsText);
    const isChoiceQuestion = questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';

    if (isChoiceQuestion && normalizedOptions.length === 0) {
      setSubmitError('选择题请把选项一起填写，系统才能更准确地讲解。');
      return;
    }

    setHelperMessage('');
    setSubmitError('');
    setLoading(true);
    setResult(null);
    setStreamPreview('');
    setStreamStatus('爱因导师正在认真审题');

    try {
      const composedQuestion = buildQuestionPayload(values.originalQuestion, questionType, normalizedOptions);

      const data = await aiService.askQuestionStream(
        {
          originalQuestion: composedQuestion,
          grade: currentUser?.grade ?? currentUser?.student?.grade ?? 3,
          context: {
            page: 'student-ai-qa-simplified',
            questionType,
          },
          fromOcr: false,
          questionType,
          options: normalizedOptions,
        },
        {
          onStatus: (message) => {
            if (message) {
              setStreamStatus(message);
            }
          },
          onChunk: (chunk) => {
            setStreamPreview((current) => current + chunk);
          },
          onResult: (streamedResult) => {
            setResult(streamedResult);
            setStreamStatus('讲解完成，可以继续追问或练习相似题。');
          },
        },
      );

      setResult(data);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'AI 讲题失败，请稍后再试。');
      setStreamStatus('这次讲解没有顺利完成。');
    } finally {
      setLoading(false);
    }
  });

  const handleUseSimilarQuestion = (question: string) => {
    setValue('originalQuestion', question);
    setQuestionType('SHORT_ANSWER');
    setOptionsText('');
    setHelperMessage('已将相似题放入输入区，可以继续点击“开始讲解”。');
  };

  const handleAddSimilarQuestionToPractice = (question: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    const current = window.localStorage.getItem(practiceQueueStorageKey);
    const parsed = current ? (JSON.parse(current) as string[]) : [];
    const merged = Array.from(new Set([...parsed, question]));
    window.localStorage.setItem(practiceQueueStorageKey, JSON.stringify(merged));
    setHelperMessage('这道相似题已加入练习清单，稍后可以去练习页完成。');
  };

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="AI讲题" description="输入题目后，爱因导师会按步骤讲解。">
        <AuthRequiredState />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="AI讲题"
      description="页面只保留输入、讲解结果和少量提示，让你更专注地看懂这一道题。"
    >
      <section className="portal-board px-5 py-5 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <article className="grid gap-4">
            <div className="rounded-[2rem] border border-[#F6D36A] bg-[linear-gradient(180deg,#FFFDF3,#FFFFFF)] px-5 py-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="math-chip math-chip-primary">专属数学辅导</span>
                <span className="math-chip math-chip-success">分步骤讲解</span>
              </div>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">把这道题交给爱因导师</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                支持直接输入题干，也支持补充题型和选项。系统会先审题，再分层给出讲解。
              </p>
            </div>

            <QuestionInputCard
              value={originalQuestion}
              questionType={questionType}
              optionsText={optionsText}
              loading={loading}
              error={submitError}
              helperMessage={helperMessage}
              onChange={(value) => setValue('originalQuestion', value)}
              onQuestionTypeChange={setQuestionType}
              onOptionsTextChange={setOptionsText}
              onSubmit={() => void onSubmit()}
            />
          </article>

          <div className="grid gap-4">
            <EinsteinTipCard
              message="如果你已经自己想过一遍，再来看分步骤讲解，效果会更好。"
              tone="yellow"
            />

            <div className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-4 shadow-sm">
              <p className="text-sm font-black text-brand-700">当前状态</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{streamStatus}</p>
            </div>

            <AnswerResultCard
              result={result}
              loading={loading}
              streamStatus={streamStatus}
              previewLines={previewLines}
              helperMessage={helperMessage}
              onUseSimilarQuestion={handleUseSimilarQuestion}
              onAddSimilarQuestionToPractice={handleAddSimilarQuestionToPractice}
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
