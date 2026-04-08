'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
import { AnswerResultCard } from '@/components/ai-qa/answer-result-card';
import { QuestionInputCard } from '@/components/ai-qa/question-input-card';
import { PageShell } from '@/components/base/page-shell';
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

function detectChoiceQuestionFromText(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const optionLines = lines.filter((line) =>
    /^[A-D][\.、\s]/i.test(line),
  );

  if (optionLines.length >= 2) {
    return {
      questionType: 'SINGLE_CHOICE',
      options: optionLines,
      stem: lines.filter((line) => !optionLines.includes(line)).join('\n').trim(),
    };
  }

  return null;
}

function buildQuestionPayload(
  originalQuestion: string,
  questionType: string,
  options: string[],
) {
  if (
    (questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') &&
    options.length > 0
  ) {
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
  const [presetQuestion, setPresetQuestion] = useState('');
  const [questionType, setQuestionType] = useState('SHORT_ANSWER');
  const [optionsText, setOptionsText] = useState('');
  const [helperMessage, setHelperMessage] = useState('');

  const previewLines = useMemo(
    () => buildPreviewLines(streamPreview),
    [streamPreview],
  );

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
        // Keep the page usable even if profile sync fails.
      }
    };

    void syncUser();
  }, [accessToken, currentUser, setSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setPresetQuestion(params.get('question') ?? '');
    const presetQuestionType = params.get('questionType');
    const presetOptions = params.get('options');

    if (presetQuestionType) {
      setQuestionType(presetQuestionType);
    }

    if (presetOptions) {
      setOptionsText(presetOptions);
    }
  }, []);

  useEffect(() => {
    if (presetQuestion) {
      setValue('originalQuestion', presetQuestion);
    }
  }, [presetQuestion, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const normalizedOptions = normalizeOptions(optionsText);
    const isChoiceQuestion =
      questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';

    if (isChoiceQuestion && normalizedOptions.length === 0) {
      setSubmitError('选择题请把选项一起填上，AI 才能更准确地讲解。');
      return;
    }

    setHelperMessage('');
    setSubmitError('');
    setLoading(true);
    setResult(null);
    setStreamPreview('');
    setStreamStatus('爱因导师正在认真审题...');

    try {
      const composedQuestion = buildQuestionPayload(
        values.originalQuestion,
        questionType,
        normalizedOptions,
      );

      const data = await aiService.askQuestionStream(
        {
          originalQuestion: composedQuestion,
          grade: currentUser?.grade ?? currentUser?.student?.grade ?? 3,
          context: {
            page: 'student-ai-qa',
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
            setStreamStatus('讲解完成，现在可以继续复习这道题了。');
          },
        },
      );

      setResult(data);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'AI 答疑失败，请稍后再试。',
      );
      setStreamStatus('这次讲解没有顺利完成。');
    } finally {
      setLoading(false);
    }
  });

  const handleUseSimilarQuestion = (question: string) => {
    setValue('originalQuestion', question);
    setQuestionType('SHORT_ANSWER');
    setOptionsText('');
    setHelperMessage('已把这道相似题放到输入区，可以继续点击“开始讲解”。');
  };

  const handleQuestionChange = (value: string) => {
    setValue('originalQuestion', value);

    const detected = detectChoiceQuestionFromText(value);
    if (!detected) {
      return;
    }

    setQuestionType(detected.questionType);
    setOptionsText(detected.options.join('\n'));
    if (detected.stem) {
      setValue('originalQuestion', detected.stem);
    }
    setHelperMessage('已自动识别为选择题，选项会一起交给 AI 讲解。');
  };

  const handleAddSimilarQuestionToPractice = (question: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    const current = window.localStorage.getItem(practiceQueueStorageKey);
    const parsed = current ? (JSON.parse(current) as string[]) : [];
    const merged = Array.from(new Set([...parsed, question]));
    window.localStorage.setItem(practiceQueueStorageKey, JSON.stringify(merged));
    setHelperMessage('这道相似题已加入练习清单，稍后可以去练习页继续做。');
  };

  return (
    <PageShell
      title="AI 数学答疑"
      description="这里不是通用聊天框，而是你的专属数学辅导助手。输入题目后，爱因导师会先审题，再一步步把思路讲清楚。"
    >
      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <article className="math-card rounded-[2rem] px-5 py-6 xl:sticky xl:top-6 xl:self-start">
          <div className="flex items-start gap-4">
            <div className="rounded-[1.3rem] bg-[linear-gradient(180deg,#F8FBFF,#EEF4FF)] p-2">
              <EinsteinMentor size="sm" mood="guide" badge="AI" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">Math AI</p>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">爱因导师讲题台</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                可以输入应用题、计算题和选择题，也能从错题本直接跳转进来继续问。
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[1.3rem] bg-[#EEF1FF] px-4 py-4">
              <p className="text-sm font-bold text-brand-700">讲解结构</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">审题、分步讲解、最终答案、知识点、难度、风险提示、相似题。</p>
            </div>
            <div className="rounded-[1.3rem] bg-[#FFF3E0] px-4 py-4">
              <p className="text-sm font-bold text-[#EF6C00]">适合谁</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">更适合小学生阅读，语言会尽量清楚、分步、可复习。</p>
            </div>
          </div>

          <div className="mt-5">
            <QuestionInputCard
              value={originalQuestion}
              questionType={questionType}
              optionsText={optionsText}
              loading={loading}
              error={submitError}
              helperMessage={helperMessage}
              onChange={handleQuestionChange}
              onQuestionTypeChange={setQuestionType}
              onOptionsTextChange={setOptionsText}
              onSubmit={() => void onSubmit()}
            />
          </div>
        </article>

        <article className="space-y-6">
          <section className="math-card rounded-[2rem] px-6 py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="math-chip math-chip-primary">专属数学辅导助手</span>
                  <span className="math-chip math-chip-success">分层输出更易读</span>
                </div>
                <h2 className="font-math-display text-3xl font-extrabold text-ink">
                  先审题，再一步步讲清楚
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  这个页面会把讲解过程拆成学生更容易读懂的层级，而不是只给一大段聊天回复。
                </p>
              </div>
              <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,#F8FBFF,#EEF4FF)] px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">当前状态</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{streamStatus}</p>
              </div>
            </div>
          </section>

          <AnswerResultCard
            result={result}
            loading={loading}
            streamStatus={streamStatus}
            previewLines={previewLines}
            helperMessage={helperMessage}
            onUseSimilarQuestion={handleUseSimilarQuestion}
            onAddSimilarQuestionToPractice={handleAddSimilarQuestionToPractice}
          />
        </article>
      </section>
    </PageShell>
  );
}
