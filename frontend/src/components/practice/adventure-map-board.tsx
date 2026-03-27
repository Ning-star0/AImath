'use client';

interface AdventureStage {
  id: string;
  emoji: string;
  title: string;
  description: string;
  difficulty?: number;
  rewardText: string;
}

interface AdventureMapBoardProps {
  grade: number;
  pendingCount: number;
  masteredCount: number;
  selectedStageId: string;
  onSelectStage: (stage: AdventureStage) => void;
}

const stages: AdventureStage[] = [
  {
    id: 'warmup',
    emoji: '🌱',
    title: '热身草地',
    description: '先做一些简单题，把脑袋热起来。',
    difficulty: 1,
    rewardText: '适合热身',
  },
  {
    id: 'river',
    emoji: '🌊',
    title: '进阶小河',
    description: '开始遇到一点思考题，练练稳定度。',
    difficulty: 2,
    rewardText: '练习稳定度',
  },
  {
    id: 'forest',
    emoji: '🌲',
    title: '思考森林',
    description: '需要多想一步，适合认真挑战。',
    difficulty: 3,
    rewardText: '开始挑战',
  },
  {
    id: 'castle',
    emoji: '🏰',
    title: '冠军城堡',
    description: '更难一点的题都在这里，适合闯关。',
    difficulty: 4,
    rewardText: '冲刺高难度',
  },
  {
    id: 'boss',
    emoji: '👑',
    title: '终极王冠关',
    description: '这是最难的一关，留给想继续突破的你。',
    difficulty: 5,
    rewardText: '终极挑战',
  },
];

export function AdventureMapBoard({
  grade,
  pendingCount,
  masteredCount,
  selectedStageId,
  onSelectStage,
}: AdventureMapBoardProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,253,244,0.96),rgba(245,243,255,0.92))] p-6 shadow-card">
      <div className="pointer-events-none absolute -left-10 top-10 h-28 w-28 rounded-full bg-brand-100/70 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-28 w-28 rounded-full bg-violet-100/70 blur-3xl" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
            冒险地图
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            {grade} 年级闯关小地图
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            选一个关卡开始挑战，系统会帮你切换到对应难度的题目区。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-500">待挑战</p>
            <p className="mt-1 text-lg font-bold text-violet-700">{pendingCount} 道</p>
          </div>
          <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-500">已掌握</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">{masteredCount} 道</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {stages.map((stage, index) => {
          const isSelected = selectedStageId === stage.id;

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectStage(stage)}
              className={`group relative rounded-3xl border p-5 text-left shadow-sm transition ${
                isSelected
                  ? 'border-brand-300 bg-white ring-2 ring-brand-100'
                  : 'border-white/80 bg-white/85 hover:-translate-y-1 hover:border-brand-200'
              }`}
            >
              {index < stages.length - 1 ? (
                <span className="pointer-events-none absolute -right-3 top-1/2 hidden h-1 w-6 -translate-y-1/2 rounded-full bg-brand-100 lg:block" />
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-sky-100 text-2xl shadow-sm">
                  {stage.emoji}
                </div>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                  {stage.rewardText}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{stage.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{stage.description}</p>
              <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                难度 {stage.difficulty}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
