'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface StateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PlatformStateCardProps {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  tone?: 'blue' | 'amber' | 'red' | 'green' | 'slate';
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
}

const toneMap = {
  blue: {
    shell: 'border-[#CAD4FF] bg-[linear-gradient(180deg,#F7F9FF,#FFFFFF)]',
    icon: 'bg-[#EEF1FF] text-[#3F51B5]',
  },
  amber: {
    shell: 'border-[#F1D48C] bg-[linear-gradient(180deg,#FFFBE9,#FFFFFF)]',
    icon: 'bg-[#FFF3D6] text-[#D98200]',
  },
  red: {
    shell: 'border-[#F2C8C8] bg-[linear-gradient(180deg,#FFF7F7,#FFFFFF)]',
    icon: 'bg-[#FDECEC] text-[#C62828]',
  },
  green: {
    shell: 'border-[#C8E3CE] bg-[linear-gradient(180deg,#F6FFF7,#FFFFFF)]',
    icon: 'bg-[#EAF7EC] text-[#2E7D32]',
  },
  slate: {
    shell: 'border-[#DDE4EC] bg-[linear-gradient(180deg,#FBFCFE,#FFFFFF)]',
    icon: 'bg-[#EEF3F8] text-[#607D8B]',
  },
};

function renderAction(action: StateAction | undefined, primary = false) {
  if (!action) {
    return null;
  }

  const className = primary
    ? 'math-button-primary rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white'
    : 'math-button-secondary rounded-[1rem] px-5 py-3 text-sm font-extrabold text-slate-700';

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

export function PlatformStateCard({
  eyebrow = '状态提示',
  title,
  description,
  icon = '!',
  tone = 'blue',
  primaryAction,
  secondaryAction,
}: PlatformStateCardProps) {
  const palette = toneMap[tone];

  return (
    <section
      className={`mx-auto max-w-3xl rounded-[2rem] border-2 px-6 py-8 text-center shadow-[0_18px_36px_rgba(15,23,42,0.08)] ${palette.shell}`}
    >
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] text-2xl font-black shadow-sm ${palette.icon}`}
      >
        {icon}
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-math-display text-3xl font-extrabold text-ink">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {renderAction(primaryAction, true)}
          {renderAction(secondaryAction, false)}
        </div>
      )}
    </section>
  );
}
