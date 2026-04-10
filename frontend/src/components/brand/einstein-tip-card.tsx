'use client';

import { EinsteinMentor } from '@/components/brand/einstein-mentor';

interface EinsteinTipCardProps {
  title?: string;
  message: string;
  mood?: 'guide' | 'celebrate' | 'focus';
  tone?: 'blue' | 'green' | 'yellow';
  className?: string;
}

const toneMap = {
  blue: 'bg-[linear-gradient(180deg,#EEF4FF,#FFFFFF)] border-[#C7D2FE]',
  green: 'bg-[linear-gradient(180deg,#F3FFF5,#FFFFFF)] border-[#B9DFC0]',
  yellow: 'bg-[linear-gradient(180deg,#FFF9E8,#FFFFFF)] border-[#F0C786]',
} as const;

export function EinsteinTipCard({
  title = '爱因导师建议',
  message,
  mood = 'guide',
  tone = 'blue',
  className = '',
}: EinsteinTipCardProps) {
  return (
    <section className={`rounded-[1.6rem] border px-4 py-4 shadow-sm ${toneMap[tone]} ${className}`}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-[1.1rem] bg-white/90 p-2 shadow-sm">
          <EinsteinMentor size="sm" mood={mood} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black tracking-[0.14em] text-brand-700">{title}</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{message}</p>
        </div>
      </div>
    </section>
  );
}
