'use client';

interface ReportSummaryCardProps {
  title: string;
  value: string;
  hint: string;
  accentClassName: string;
  active?: boolean;
  badgeText?: string;
  onClick?: () => void;
}

export function ReportSummaryCard({
  title,
  value,
  hint,
  accentClassName,
  active = false,
  badgeText,
  onClick,
}: ReportSummaryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-3xl border bg-white/90 p-6 text-left shadow-card transition ${
        active
          ? 'border-brand-200 ring-2 ring-brand-100 -translate-y-1'
          : 'border-white/70 hover:-translate-y-0.5 hover:border-brand-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{title}</p>
        {badgeText ? (
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
            {badgeText}
          </span>
        ) : null}
      </div>
      <p className={`mt-3 text-3xl font-bold ${accentClassName}`}>{value}</p>
      <p className="mt-3 text-xs leading-6 text-slate-500">{hint}</p>
    </button>
  );
}
