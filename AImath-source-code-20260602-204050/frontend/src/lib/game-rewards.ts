'use client';

interface RewardState {
  totalStars: number;
  streakDays: number;
  lastActiveDate: string | null;
}

export interface RewardProgress {
  level: number;
  currentExp: number;
  expToNextLevel: number;
  progressPercent: number;
  totalExp: number;
}

export interface LevelTitle {
  title: string;
  subtitle: string;
}

const defaultRewardState: RewardState = {
  totalStars: 0,
  streakDays: 0,
  lastActiveDate: null,
};

function getStorageKey(userId?: string | null) {
  return `student-reward-state:${userId ?? 'guest'}`;
}

function diffDays(left: string, right: string) {
  const leftDate = new Date(`${left}T00:00:00`);
  const rightDate = new Date(`${right}T00:00:00`);
  return Math.round(
    (rightDate.getTime() - leftDate.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function readRewardState(userId?: string | null): RewardState {
  if (typeof window === 'undefined') {
    return defaultRewardState;
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      return defaultRewardState;
    }

    return {
      ...defaultRewardState,
      ...(JSON.parse(raw) as Partial<RewardState>),
    };
  } catch {
    return defaultRewardState;
  }
}

export function saveRewardState(userId: string | null | undefined, state: RewardState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
}

export function markLearningActive(userId?: string | null) {
  const current = readRewardState(userId);
  const today = getTodayDateString();

  if (current.lastActiveDate === today) {
    return current;
  }

  const nextStreak =
    current.lastActiveDate && diffDays(current.lastActiveDate, today) === 1
      ? current.streakDays + 1
      : 1;

  const nextState: RewardState = {
    ...current,
    streakDays: nextStreak,
    lastActiveDate: today,
  };

  saveRewardState(userId, nextState);
  return nextState;
}

export function awardStars(userId: string | null | undefined, amount: number) {
  const current = markLearningActive(userId);
  const nextState: RewardState = {
    ...current,
    totalStars: current.totalStars + amount,
  };

  saveRewardState(userId, nextState);
  return nextState;
}

const levelThresholds = [12, 18, 28, 42, 60, 85, 115, 150, 190, 235];

function getExpNeededForLevel(level: number) {
  if (level <= levelThresholds.length) {
    return levelThresholds[level - 1];
  }

  const extraLevel = level - levelThresholds.length;
  return levelThresholds[levelThresholds.length - 1] + extraLevel * 50;
}

export function getRewardProgress(totalStars: number): RewardProgress {
  const normalizedStars = Math.max(0, totalStars);
  let level = 1;
  let expUsed = 0;

  while (normalizedStars >= expUsed + getExpNeededForLevel(level)) {
    expUsed += getExpNeededForLevel(level);
    level += 1;
  }

  const expToNextLevel = getExpNeededForLevel(level);
  const currentExp = normalizedStars - expUsed;

  return {
    level,
    currentExp,
    expToNextLevel,
    progressPercent: Math.round((currentExp / expToNextLevel) * 100),
    totalExp: normalizedStars,
  };
}

export function getLevelTitle(level: number): LevelTitle {
  if (level <= 2) {
    return {
      title: '数学小新芽',
      subtitle: '刚刚开始冒险，先把基础练稳。',
    };
  }

  if (level <= 4) {
    return {
      title: '计算小能手',
      subtitle: '已经越来越熟练了，继续冲关吧。',
    };
  }

  if (level <= 6) {
    return {
      title: '闯关小勇士',
      subtitle: '会做的题越来越多，已经很有节奏啦。',
    };
  }

  if (level <= 9) {
    return {
      title: '数学冒险家',
      subtitle: '开始能稳定解决更难的题目了。',
    };
  }

  return {
    title: '星光数学家',
    subtitle: '你已经是会一路成长的数学小达人。',
  };
}
