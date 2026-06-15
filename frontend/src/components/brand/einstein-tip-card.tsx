'use client';

import Image from 'next/image';

interface EinsteinTipCardProps {
  title?: string;
  message: string;
  mood?: 'guide' | 'celebrate' | 'focus';
  tone?: 'blue' | 'green' | 'yellow';
  className?: string;
}

const toneMap = {
  blue: 'bg-white border-[#C7D2FE]',
  green: 'bg-white border-[#B9DFC0]',
  yellow: 'bg-white border-[#F0C786]',
} as const;

export function EinsteinTipCard({
  title = '爱因导师建议',
  message,
  tone = 'blue',
  className = '',
}: EinsteinTipCardProps) {
  return (
    <section className={`rounded-[1.6rem] border px-4 py-4 shadow-sm ${toneMap[tone]} ${className}`}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-[1.1rem] bg-white p-2 shadow-sm">
          <Image
            src="/brand/ai-robot-mentor.png"
            alt="AI 机器人导师头像"
            width={96}
            height={96}
            priority={false}
            className="h-24 w-24 rounded-[1rem] object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black tracking-[0.14em] text-brand-700">{title}</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{message}</p>
        </div>
      </div>
    </section>
  );
}
