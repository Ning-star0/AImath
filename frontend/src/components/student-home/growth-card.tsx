'use client';

interface GrowthCardProps {
  emoji: string;
  title: string;
  value: string;
  helper: string;
  tone?: 'green' | 'blue' | 'yellow' | 'purple';
}

const toneStyles: Record<
  NonNullable<GrowthCardProps['tone']>,
  { border: string; bg: string; value: string }
> = {
  green: {
    border: 'border-emerald-100',
    bg: 'bg-emerald-50/80',
    value: 'text-emerald-700',
  },
  blue: {
    border: 'border-sky-100',
    bg: 'bg-sky-50/80',
    value: 'text-sky-700',
  },
  yellow: {
    border: 'border-amber-100',
    bg: 'bg-amber-50/80',
    value: 'text-amber-700',
  },
  purple: {
    border: 'border-violet-100',
    bg: 'bg-violet-50/80',
    value: 'text-violet-700',
  },
};

export function GrowthCard({
  emoji,
  title,
  value,
  helper,
  tone = 'green',
}: GrowthCardProps) {
  const style = toneStyles[tone];

  return (
    <article
      className={`rounded-[1.75rem] border ${style.border} ${style.bg} p-5 shadow-sm transition hover:-translate-y-1`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
          {emoji}
        </div>
        <p className="text-sm font-semibold text-slate-600">{title}</p>
      </div>
      <p className={`mt-4 text-3xl font-bold ${style.value}`}>{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </article>
  );
}
