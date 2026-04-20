'use client';

interface KnowledgeTagsProps {
  points: string[];
}

export function KnowledgeTags({ points }: KnowledgeTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {points.map((point) => (
        <span
          key={point}
          className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700"
        >
          {point}
        </span>
      ))}
    </div>
  );
}
