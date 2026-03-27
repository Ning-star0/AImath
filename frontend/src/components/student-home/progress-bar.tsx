'use client';

interface ProgressBarProps {
  value: number;
  total: number;
  tone?: 'green' | 'blue' | 'yellow' | 'purple';
}

const toneClassMap: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  green: 'from-emerald-400 to-brand-600',
  blue: 'from-sky-400 to-sky-600',
  yellow: 'from-amber-300 to-amber-500',
  purple: 'from-violet-400 to-fuchsia-500',
};

export function ProgressBar({
  value,
  total,
  tone = 'green',
}: ProgressBarProps) {
  const normalizedTotal = total <= 0 ? 1 : total;
  const percent = Math.max(
    0,
    Math.min(100, Math.round((value / normalizedTotal) * 100)),
  );

  return (
    <div className="space-y-2">
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${toneClassMap[tone]} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs font-medium text-slate-500">{percent}% 已完成</p>
    </div>
  );
}
