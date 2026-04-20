'use client';

interface StepListProps {
  steps: string[];
}

function buildStepBadge(index: number) {
  return String(index + 1).padStart(2, '0');
}

export function StepList({ steps }: StepListProps) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div
          key={`${index + 1}-${step}`}
          className="flex gap-3 rounded-[1.5rem] border border-brand-100 bg-brand-50/60 px-4 py-4 shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-brand-700 shadow-sm ring-1 ring-brand-100">
            {buildStepBadge(index)}
          </div>
          <p className="text-sm leading-7 text-slate-700">{step}</p>
        </div>
      ))}
    </div>
  );
}
