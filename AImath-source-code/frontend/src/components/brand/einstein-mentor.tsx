'use client';

interface EinsteinMentorProps {
  size?: 'sm' | 'md' | 'lg';
  mood?: 'guide' | 'celebrate' | 'focus';
  badge?: string;
  className?: string;
  showBubble?: boolean;
}

function getSizeMap(size: EinsteinMentorProps['size']) {
  if (size === 'sm') {
    return {
      shell: 'h-24 w-24',
      head: 'h-14 w-14',
      hair: 'h-9 w-16',
      body: 'h-10 w-14',
      arm: 'h-7 w-3',
      badge: 'text-[10px]',
    };
  }

  if (size === 'lg') {
    return {
      shell: 'h-44 w-40',
      head: 'h-24 w-24',
      hair: 'h-14 w-28',
      body: 'h-16 w-24',
      arm: 'h-11 w-3',
      badge: 'text-xs',
    };
  }

  return {
    shell: 'h-32 w-28',
    head: 'h-18 w-18',
    hair: 'h-11 w-22',
    body: 'h-12 w-18',
    arm: 'h-8 w-3',
    badge: 'text-[11px]',
  };
}

function getMoodCopy(mood: EinsteinMentorProps['mood']) {
  if (mood === 'celebrate') {
    return {
      accent: 'from-[#FFB300] to-[#FF9800]',
      bubble: '你今天也在认真进步。',
      sparkle: '★',
    };
  }

  if (mood === 'focus') {
    return {
      accent: 'from-[#4CAF50] to-[#2E7D32]',
      bubble: '一步一步来，会越来越清楚。',
      sparkle: 'π',
    };
  }

  return {
    accent: 'from-[#3F51B5] to-[#5C6BC0]',
    bubble: '我来陪你学数学。',
    sparkle: '√',
  };
}

export function EinsteinMentor({
  size = 'md',
  mood = 'guide',
  badge,
  className = '',
  showBubble = false,
}: EinsteinMentorProps) {
  const sizes = getSizeMap(size);
  const moodCopy = getMoodCopy(mood);

  return (
    <div className={`relative ${sizes.shell} ${className}`}>
      {showBubble ? (
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-[0_10px_24px_rgba(63,81,181,0.18)]">
          {moodCopy.bubble}
        </div>
      ) : null}

      <div className={`absolute left-1/2 ${showBubble ? 'top-9' : 'top-1'} -translate-x-1/2`}>
        <div className={`relative ${sizes.head}`}>
          <div
            className={`absolute left-1/2 top-0 -translate-x-1/2 rounded-[999px] bg-white shadow-[0_12px_22px_rgba(255,255,255,0.72)] ${sizes.hair}`}
          />
          <div className="absolute left-0 top-3 h-8 w-4 rounded-full bg-white shadow-[0_8px_18px_rgba(255,255,255,0.62)]" />
          <div className="absolute right-0 top-3 h-8 w-4 rounded-full bg-white shadow-[0_8px_18px_rgba(255,255,255,0.62)]" />
          <div className="absolute left-1/2 top-4 h-full w-full -translate-x-1/2 rounded-full border-4 border-[#6B4F3A] bg-[#FFF1E3]">
            <div className="absolute left-3 top-5 h-4 w-4 rounded-full border-2 border-[#607D8B] bg-white" />
            <div className="absolute right-3 top-5 h-4 w-4 rounded-full border-2 border-[#607D8B] bg-white" />
            <div className="absolute left-[1.65rem] top-[1.65rem] h-1.5 w-1.5 rounded-full bg-slate-700" />
            <div className="absolute right-[1.65rem] top-[1.65rem] h-1.5 w-1.5 rounded-full bg-slate-700" />
            <div className="absolute left-1/2 top-[2.15rem] h-2 w-2.5 -translate-x-1/2 rounded-full bg-[#E8A06A]" />
            <div className="absolute left-1/2 top-[2.7rem] h-2 w-7 -translate-x-1/2 rounded-full border-b-4 border-[#6B4F3A]" />
            <div className="absolute left-1/2 top-[3.05rem] h-2.5 w-9 -translate-x-1/2 rounded-full bg-[#6B4F3A]" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
        <div className={`relative rounded-[2rem] border-4 border-[#4F6570] ${sizes.body} bg-gradient-to-b ${moodCopy.accent}`}>
          <div className={`absolute -left-3 top-1/2 -translate-y-1/2 -rotate-[55deg] rounded-full bg-[#FFF1E3] ${sizes.arm}`} />
          <div className={`absolute -right-3 top-1/2 -translate-y-1/2 rotate-[55deg] rounded-full bg-[#FFF1E3] ${sizes.arm}`} />
          <div className="absolute left-1/2 top-2 h-4 w-4 -translate-x-1/2 rounded-full bg-[#FFEB3B]" />
          <div className="absolute left-1/2 top-1 h-2 w-7 -translate-x-1/2 rounded-full bg-[#34515E]" />
          <div className="absolute -right-1 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm text-[#3F51B5] shadow-[0_10px_18px_rgba(63,81,181,0.2)]">
            {moodCopy.sparkle}
          </div>
        </div>
      </div>

      {badge ? (
        <div
          className={`absolute bottom-0 right-0 rounded-full bg-[#FFEB3B] px-3 py-1 font-black text-[#6B4F3A] shadow-[0_10px_20px_rgba(255,235,59,0.38)] ${sizes.badge}`}
        >
          {badge}
        </div>
      ) : null}
    </div>
  );
}
