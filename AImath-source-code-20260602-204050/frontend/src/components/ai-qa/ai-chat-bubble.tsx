'use client';

import type { ReactNode } from 'react';

interface AiChatBubbleProps {
  role: 'student' | 'ai';
  title: string;
  children: ReactNode;
  accent?: ReactNode;
}

export function AiChatBubble({
  role,
  title,
  children,
  accent,
}: AiChatBubbleProps) {
  const isStudent = role === 'student';

  return (
    <div className={`flex gap-3 ${isStudent ? 'justify-end' : 'justify-start'}`}>
      {!isStudent ? (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 via-emerald-50 to-sky-100 text-lg shadow-sm">
          🤖
        </div>
      ) : null}

      <div
        className={`max-w-3xl rounded-[1.75rem] px-5 py-4 shadow-sm ${
          isStudent
            ? 'border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.98),rgba(224,242,254,0.95))]'
            : 'border border-brand-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,244,0.95))]'
        }`}
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-ink">{title}</p>
          {accent}
        </div>
        <div className="mt-2 text-sm leading-7 text-slate-700">{children}</div>
      </div>

      {isStudent ? (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-100 to-indigo-100 text-lg shadow-sm">
          🧒
        </div>
      ) : null}
    </div>
  );
}
