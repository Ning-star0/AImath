'use client';

interface AnswerCardProps {
  answer: string;
}

export function AnswerCard({ answer }: AnswerCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-amber-100 bg-gradient-to-r from-amber-50 via-white to-emerald-50 px-5 py-5 shadow-sm">
      <div className="pointer-events-none absolute -right-4 top-0 h-20 w-20 rounded-full bg-amber-100/70 blur-2xl" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-amber-700 shadow-sm">
        🎁 讲解完成
      </div>
      <p className="pt-6 text-sm font-semibold text-amber-800">🎉 最终答案</p>
      <p className="mt-3 text-2xl font-bold text-emerald-700 sm:text-3xl">
        {answer}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        记住这个答案后，再去挑战下一道相似题吧。
      </p>
    </div>
  );
}
