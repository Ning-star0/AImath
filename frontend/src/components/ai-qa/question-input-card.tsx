'use client';

const questionTypeOptions = [
  { value: 'SHORT_ANSWER', label: '应用题 / 解答题' },
  { value: 'SINGLE_CHOICE', label: '单选题' },
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
  compact?: boolean;
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
  compact = false,
  onChange,
  onQuestionTypeChange,
  onOptionsTextChange,
  onSubmit,
}: QuestionInputCardProps) {
  const isChoiceQuestion =
    questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';

  return (
    <section className={`relative overflow-hidden rounded-[1.4rem] border border-white/80 bg-white shadow-card ${compact ? 'p-4' : 'p-6 sm:p-7'}`}>
      <div className={compact ? 'flex flex-col gap-3' : 'flex flex-col gap-4'}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`${compact ? 'h-9 w-9 rounded-2xl text-sm' : 'h-12 w-12 rounded-3xl text-lg'} flex items-center justify-center bg-gradient-to-br from-brand-100 to-sky-100 font-semibold text-brand-700 shadow-sm`}>
              题
            </div>
            <div>
              <h2 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-ink`}>输入需要讲解的题目</h2>
              {!compact ? (
                <p className="text-sm leading-6 text-slate-500">
                  题目信息越完整，爱因导师给出的讲解会越清楚。
                </p>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            AI 讲题入口
          </div>
        </div>

        <div className={compact ? 'grid gap-3' : 'grid gap-4'}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">题目类型</label>
            <select
              value={questionType}
              onChange={(event) => onQuestionTypeChange(event.target.value)}
              className={`${compact ? 'rounded-xl px-3 py-2.5' : 'rounded-2xl px-4 py-3'} w-full border border-slate-200 bg-white text-sm text-slate-700 outline-none transition focus:border-brand-500`}
            >
              {questionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">题目内容</label>
            <textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={compact ? 3 : 4}
              className={`${compact ? 'rounded-2xl px-3 py-3' : 'rounded-[1.75rem] px-4 py-4'} w-full resize-none border border-slate-200 text-sm leading-7 text-slate-700 outline-none transition focus:border-brand-500`}
              placeholder="例如：35 + 27 等于多少？请一步一步讲给我听。"
            />
          </div>

          {isChoiceQuestion ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">题目选项</label>
              <textarea
                value={optionsText}
                onChange={(event) => onOptionsTextChange(event.target.value)}
                rows={compact ? 3 : 4}
                className={`${compact ? 'rounded-2xl px-3 py-3' : 'rounded-[1.75rem] px-4 py-4'} w-full resize-none border border-slate-200 text-sm leading-7 text-slate-700 outline-none transition focus:border-brand-500`}
                placeholder={'每行一个选项，例如：\nA. 40\nB. 50\nC. 52\nD. 60'}
              />
              {!compact ? (
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  选择题请把选项一并填写，AI 讲解会更准确。
                </p>
              ) : null}
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

          <div className={compact ? '' : 'rounded-3xl border border-slate-100 bg-white p-3 shadow-sm'}>
            {!compact ? (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
                <span>提示：题目写得越完整，讲解会越清楚。</span>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] text-sky-700">
                  爱因导师已就绪
                </span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? '正在生成讲解...' : '开始讲解'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
