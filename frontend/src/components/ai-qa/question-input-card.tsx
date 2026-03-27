'use client';

const questionTypeOptions = [
  { value: 'SHORT_ANSWER', label: '应用题 / 解答题' },
  { value: 'SINGLE_CHOICE', label: '选择题' },
  { value: 'MULTIPLE_CHOICE', label: '多选题' },
  { value: 'FILL_BLANK', label: '填空题' },
];

interface QuestionInputCardProps {
  value: string;
  questionType: string;
  optionsText: string;
  loading: boolean;
  error?: string;
  helperMessage?: string;
  onChange: (value: string) => void;
  onQuestionTypeChange: (value: string) => void;
  onOptionsTextChange: (value: string) => void;
  onSubmit: () => void;
}

export function QuestionInputCard({
  value,
  questionType,
  optionsText,
  loading,
  error,
  helperMessage,
  onChange,
  onQuestionTypeChange,
  onOptionsTextChange,
  onSubmit,
}: QuestionInputCardProps) {
  const isChoiceQuestion =
    questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(239,252,246,0.96),rgba(239,246,255,0.94))] p-6 shadow-card sm:p-7">
      <div className="pointer-events-none absolute -left-6 top-6 h-24 w-24 rounded-full bg-brand-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-3 bottom-8 h-24 w-24 rounded-full bg-violet-100/60 blur-3xl" />
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-sky-100 text-lg font-semibold text-brand-700 shadow-sm">
            🤖
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">把不会的题交给 AI 老师</h2>
            <p className="text-sm leading-6 text-slate-500">
              把题目写完整一些，小数老师会先读题，再一步一步慢慢讲。
            </p>
          </div>
          </div>
          <div className="shrink-0 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
            🌈 勇敢提问
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              这是什么题
            </label>
            <select
              value={questionType}
              onChange={(event) => onQuestionTypeChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-500"
            >
              {questionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              题目
            </label>
            <textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-[1.75rem] border border-slate-200 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-brand-500"
              placeholder="例如：35 + 27 等于多少？请一步一步讲给我听。"
            />
          </div>

          {isChoiceQuestion ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                选项
              </label>
              <textarea
                value={optionsText}
                onChange={(event) => onOptionsTextChange(event.target.value)}
                rows={4}
                className="w-full resize-none rounded-[1.75rem] border border-slate-200 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-brand-500"
                placeholder={'每行一个选项，例如：\nA. 40\nB. 50\nC. 52\nD. 60'}
              />
              <p className="mt-2 text-xs leading-6 text-slate-500">
                把选项一起写上，AI 老师讲选择题会更准确。
              </p>
            </div>
          ) : null}

          {helperMessage ? (
            <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
              {helperMessage}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="rounded-3xl border border-white/80 bg-white/70 p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-brand-50/80 px-3 py-2 text-xs font-semibold text-brand-700">
              <span>✨ 提示：题目写得越完整，讲解会越清楚。</span>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] text-sky-700">
                小数老师在等你
              </span>
            </div>
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <span>{loading ? '🌀' : '🎧'}</span>
              {loading ? 'AI 老师正在讲解...' : '开始听讲解'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
