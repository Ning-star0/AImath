'use client';

interface EinsteinMentorProps {
  size?: 'sm' | 'md' | 'lg';
  mood?: 'guide' | 'celebrate' | 'focus';
  badge?: string;
  className?: string;
}

function getSizeMap(size: EinsteinMentorProps['size']) {
  if (size === 'sm') {
    return {
      shell: 'h-24 w-24',
      head: 'h-14 w-14',
      hair: 'h-9 w-16',
      body: 'h-10 w-16',
      badge: 'text-[10px]',
    };
  }

  if (size === 'lg') {
    return {
      shell: 'h-48 w-44',
      head: 'h-28 w-28',
      hair: 'h-16 w-32',
      body: 'h-20 w-28',
      badge: 'text-sm',
    };
  }

  return {
    shell: 'h-36 w-32',
    head: 'h-20 w-20',
    hair: 'h-12 w-24',
    body: 'h-14 w-20',
    badge: 'text-xs',
  };
}

function getMoodCopy(mood: EinsteinMentorProps['mood']) {
  if (mood === 'celebrate') {
    return {
      accent: 'from-[#FFB300] to-[#FF9800]',
      bubble: '今天也要把难题变成勋章',
      sparkle: '✦',
    };
  }

  if (mood === 'focus') {
    return {
      accent: 'from-[#4CAF50] to-[#2E7D32]',
      bubble: '一步一步来，数学会变清楚',
      sparkle: 'π',
    };
  }

  return {
    accent: 'from-[#3F51B5] to-[#5C6BC0]',
    bubble: '我来陪你学数学',
    sparkle: '∑',
  };
}

export function EinsteinMentor({
  size = 'md',
  mood = 'guide',
  badge,
  className = '',
}: EinsteinMentorProps) {
  const sizes = getSizeMap(size);
  const moodCopy = getMoodCopy(mood);

  return (
    <div className={`relative ${sizes.shell} ${className}`}>
      <div className="absolute left-4 top-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-[0_10px_24px_rgba(63,81,181,0.18)]">
        {moodCopy.bubble}
      </div>

      <div className="absolute left-1/2 top-10 -translate-x-1/2">
        <div className={`relative ${sizes.head}`}>
          <div
            className={`absolute left-1/2 top-0 -translate-x-1/2 rounded-[999px] bg-white shadow-[0_12px_22px_rgba(255,255,255,0.72)] ${sizes.hair}`}
          />
          <div className="absolute left-0 top-4 h-10 w-5 rounded-full bg-white shadow-[0_8px_18px_rgba(255,255,255,0.62)]" />
          <div className="absolute right-0 top-4 h-10 w-5 rounded-full bg-white shadow-[0_8px_18px_rgba(255,255,255,0.62)]" />
          <div className="absolute left-1/2 top-5 h-full w-full -translate-x-1/2 rounded-full border-4 border-[#6B4F3A] bg-[#FFF3E8]">
            <div className="absolute left-4 top-7 h-4 w-4 rounded-full border-2 border-[#607D8B] bg-white" />
            <div className="absolute right-4 top-7 h-4 w-4 rounded-full border-2 border-[#607D8B] bg-white" />
            <div className="absolute left-[2.15rem] top-[2.1rem] h-1.5 w-1.5 rounded-full bg-slate-700" />
            <div className="absolute right-[2.15rem] top-[2.1rem] h-1.5 w-1.5 rounded-full bg-slate-700" />
            <div className="absolute left-1/2 top-[2.65rem] h-2.5 w-3 -translate-x-1/2 rounded-full bg-[#E8A06A]" />
            <div className="absolute left-1/2 top-[3.4rem] h-2.5 w-8 -translate-x-1/2 rounded-full border-b-4 border-[#6B4F3A]" />
            <div className="absolute left-1/2 top-[3.95rem] h-2.5 w-11 -translate-x-1/2 rounded-full bg-white" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
        <div className={`relative rounded-[2rem] border-4 border-[#607D8B] ${sizes.body} bg-gradient-to-b ${moodCopy.accent}`}>
          <div className="absolute left-1/2 top-3 h-5 w-5 -translate-x-1/2 rounded-full bg-[#FFEB3B]" />
          <div className="absolute left-2 top-4 h-9 w-3 rounded-full bg-[#FFF3E8]" />
          <div className="absolute -right-1 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-[#3F51B5] shadow-[0_10px_18px_rgba(63,81,181,0.2)]">
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
