'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AnswerResultCard } from '@/components/ai-qa/answer-result-card';
import { QuestionInputCard } from '@/components/ai-qa/question-input-card';
import { PageShell } from '@/components/base/page-shell';
import { EinsteinTipCard } from '@/components/brand/einstein-tip-card';
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

async function compressImageForOcr(file: File): Promise<string> {
  const maxSide = 1600;
  const outputQuality = 0.78;
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('图片读取失败，请更换图片后重试。'));
    image.src = objectUrl;
  });

  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');

  if (!context) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('图片处理失败，请刷新页面后重试。');
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  URL.revokeObjectURL(objectUrl);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', outputQuality);
  });

  if (!blob) {
    throw new Error('图片压缩失败，请重试。');
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('图片编码失败，请重试。'));
    reader.readAsDataURL(blob);
  });
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
  const [selectedImageName, setSelectedImageName] = useState('');
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState('');
  const [ocrDraftText, setOcrDraftText] = useState('');
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrOptions, setOcrOptions] = useState<string[]>([]);

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

  const runAiExplain = async (
    questionText: string,
    nextHelperMessage = '',
    options?: {
      skipImageVision?: boolean;
    },
  ) => {
    const normalizedOptions = normalizeOptions(optionsText);
    const isChoiceQuestion = questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';

    if (isChoiceQuestion && normalizedOptions.length === 0) {
      setSubmitError('选择题请把选项一起填写，系统才能更准确地讲解。');
      return false;
    }

    const safeQuestionText = questionText.trim() || ocrDraftText.trim() || '图片数学题';
    const composedQuestion = buildQuestionPayload(safeQuestionText, questionType, normalizedOptions);
    const hasImageInput = Boolean(selectedImageDataUrl);
    const hasRecognizedQuestion = Boolean(ocrDraftText.trim());
    const shouldUseImageVision =
      hasImageInput && !hasRecognizedQuestion && !options?.skipImageVision;

    setHelperMessage(nextHelperMessage);
    setSubmitError('');
    setLoading(true);
    setResult(null);
    setStreamPreview('');
    setStreamStatus('爱因导师正在认真审题');

    try {
      const data = await aiService.askQuestionStream(
        {
          originalQuestion: composedQuestion,
          grade: currentUser?.grade ?? currentUser?.student?.grade ?? 3,
          context: {
            page: 'student-ai-qa-simplified',
            questionType,
            answerMode: shouldUseImageVision ? 'vision' : 'text',
          },
          fromOcr: hasImageInput,
          questionType,
          options: normalizedOptions,
          imageDataUrl: shouldUseImageVision ? selectedImageDataUrl || undefined : undefined,
          manualHint: ocrDraftText || questionText || undefined,
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
      return true;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'AI 讲题失败，请稍后再试。');
      setStreamStatus('这次讲解没有顺利完成。');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    await runAiExplain(values.originalQuestion);
  });

  const handleOcrPreview = async () => {
    setOcrLoading(true);
    setSubmitError('');
    setOcrStatus('正在识别题干...');

    try {
      const preview = await aiService.ocrPreview({
        imageName: selectedImageName || undefined,
        imageDataUrl: selectedImageDataUrl || undefined,
        manualText: ocrDraftText || undefined,
        questionType,
        grade: currentUser?.student?.grade ?? currentUser?.grade ?? 3,
      });

      setOcrDraftText(preview.recognizedText);
      setOcrOptions(preview.options);
      setQuestionType(preview.questionType);
      if (preview.options.length > 0) {
        setOptionsText(preview.options.join('\n'));
      }
      setOcrStatus(preview.note);
    } catch (error) {
      setOcrStatus(error instanceof Error ? error.message : '识别失败，请手动补充题干后再试。');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleUseOcrResult = async () => {
    if (!ocrDraftText.trim() && !selectedImageDataUrl) {
      setSubmitError('请先上传图片，或手动补充题干后再继续。');
      return;
    }

    const nextQuestionText = ocrDraftText.trim() || '图片数学题';
    setValue('originalQuestion', nextQuestionText);

    if (ocrOptions.length > 0 && !optionsText.trim()) {
      setOptionsText(ocrOptions.join('\n'));
    }

    const helperText = selectedImageDataUrl
      ? '已优先根据识别出的题干直接讲题，跳过再次整图识别，速度会更快。'
      : '已根据识别结果直接发起讲题。';

    await runAiExplain(
      nextQuestionText,
      selectedImageDataUrl ? '已根据图片和识别结果直接发起讲题。' : '已根据识别结果直接发起讲题。',
    );
  };

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
      description="这里保留题目输入、图片讲题和讲解结果，让你更专注地看懂这道题。"
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
                支持直接输入题干，也支持上传图片。现在图片题可以直接进入 AI 讲题，不再必须先确认 OCR 文本。
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

            <div className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-math-display text-2xl font-extrabold text-ink">拍照答疑与识题</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    识别题干只作为辅助确认。上传图片后，你可以先看识别结果，也可以直接使用识别结果讲题。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleOcrPreview()}
                  disabled={ocrLoading}
                  className="math-button-secondary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700 disabled:opacity-60"
                >
                  {ocrLoading ? '识别中...' : '识别题干'}
                </button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-500">图片上传 / 拍照入口</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      setSelectedImageName(file?.name ?? '');
                      setSelectedImageDataUrl('');
                      setSubmitError('');
                      setOcrStatus('');

                      if (!file) {
                        return;
                      }

                      try {
                        const nextValue = await compressImageForOcr(file);
                        setSelectedImageDataUrl(nextValue);
                        setOcrStatus('图片已压缩并就绪，可以识别题干或直接讲题。');
                        return;
                      } catch (error) {
                        setSelectedImageDataUrl('');
                        setOcrStatus(
                          error instanceof Error
                            ? error.message
                            : '图片处理失败，请重新选择图片后再试。',
                        );
                        return;
                      }

                      const reader = new FileReader();
                      reader.onload = () => {
                        const nextValue = typeof reader.result === 'string' ? reader.result : '';
                        setSelectedImageDataUrl(nextValue);
                      };
                      reader.onerror = () => {
                        setOcrStatus('图片读取失败，请重新选择图片后再试。');
                      };
                      reader.readAsDataURL(file as Blob);
                    }}
                    className="math-input"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-500">OCR 识别结果人工确认</span>
                  <textarea
                    value={ocrDraftText}
                    onChange={(event) => setOcrDraftText(event.target.value)}
                    className="math-input min-h-[128px]"
                    placeholder="如果识别不完整，可以先在这里补充题干，再点“使用识别结果讲题”。"
                  />
                </label>
              </div>

              <div className="mt-4 rounded-[1.2rem] bg-[#F8FBFF] px-4 py-4 text-sm leading-7 text-slate-600">
                {ocrStatus || '这里会显示 OCR 状态、识别说明和失败兜底提示。'}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleUseOcrResult()}
                  className="math-button-primary rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white"
                >
                  使用识别结果讲题
                </button>
                {selectedImageName ? (
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                    当前图片：{selectedImageName}
                  </span>
                ) : null}
              </div>
            </div>
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
