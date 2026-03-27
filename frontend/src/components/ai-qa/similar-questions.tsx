'use client';

interface SimilarQuestionsProps {
  questions: string[];
  onUseQuestion: (question: string) => void;
  onAddToPractice: (question: string) => void;
}

export function SimilarQuestions({
  questions,
  onUseQuestion,
  onAddToPractice,
}: SimilarQuestionsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {questions.map((question) => (
        <div
          key={question}
          className="rounded-[1.5rem] border border-violet-100 bg-violet-50/70 px-4 py-4 shadow-sm transition hover:-translate-y-1"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-sm shadow-sm">
              🎯
            </span>
            <p className="text-sm font-semibold text-violet-700">挑战题</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{question}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onUseQuestion(question)}
              className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-900"
            >
              先讲给我听
            </button>
            <button
              type="button"
              onClick={() => onAddToPractice(question)}
              className="rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:border-brand-300"
            >
              加入我的练习
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
