'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { EinsteinTipCard } from '@/components/brand/einstein-tip-card';
import { PageShell } from '@/components/base/page-shell';
import {
  AuthRequiredState,
  NetworkErrorState,
  PageLoadErrorState,
  PermissionDeniedState,
  SessionExpiredState,
} from '@/components/states/platform-states';
import { getPlatformErrorKind } from '@/lib/platform-errors';
import { familyService, type FamilyOverviewResult } from '@/services/family.service';
import { useUserStore } from '@/store/use-user-store';

interface BindChildFormValues {
  studentCode: string;
  studentPassword: string;
  relationLabel: string;
}

const relationOptions = ['妈妈', '爸爸', '监护人', '家人'];
const radarPalette = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#0EA5E9', '#22C55E'];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatRadarLabel(label: string) {
  return label.length > 8 ? `${label.slice(0, 8)}...` : label;
}

function FamilyRadarChart({
  items,
}: {
  items: FamilyOverviewResult['knowledgeRadar'];
}) {
  const chartItems = items.slice(0, 5);

  if (chartItems.length === 0) {
    return (
      <div className="rounded-[1.3rem] bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-500">
        暂时还没有足够的练习数据来绘制知识点掌握度雷达图。
      </div>
    );
  }

  const size = 260;
  const center = size / 2;
  const radius = 90;
  const levels = 4;

  const points = chartItems.map((item, index) => {
    const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / chartItems.length;
    const scale = clamp(item.mastery / 100, 0.12, 1);
    return {
      ...item,
      angle,
      x: center + Math.cos(angle) * radius * scale,
      y: center + Math.sin(angle) * radius * scale,
      labelX: center + Math.cos(angle) * (radius + 26),
      labelY: center + Math.sin(angle) * (radius + 26),
      axisX: center + Math.cos(angle) * radius,
      axisY: center + Math.sin(angle) * radius,
    };
  });

  const polygon = points.map((item) => `${item.x},${item.y}`).join(' ');

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-[260px] w-[260px]">
        {[...Array(levels)].map((_, levelIndex) => {
          const levelRadius = (radius * (levelIndex + 1)) / levels;
          const levelPoints = chartItems
            .map((_, index) => {
              const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / chartItems.length;
              const x = center + Math.cos(angle) * levelRadius;
              const y = center + Math.sin(angle) * levelRadius;
              return `${x},${y}`;
            })
            .join(' ');

          return (
            <polygon
              key={levelIndex}
              points={levelPoints}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          );
        })}

        {points.map((item) => (
          <line
            key={item.knowledgePointName}
            x1={center}
            y1={center}
            x2={item.axisX}
            y2={item.axisY}
            stroke="#E2E8F0"
            strokeWidth="1"
          />
        ))}

        <polygon points={polygon} fill="rgba(79, 70, 229, 0.16)" stroke="#4F46E5" strokeWidth="3" />

        {points.map((item, index) => (
          <circle key={item.knowledgePointName} cx={item.x} cy={item.y} r="5" fill={radarPalette[index % radarPalette.length]} />
        ))}

        {points.map((item) => (
          <text
            key={`${item.knowledgePointName}-label`}
            x={item.labelX}
            y={item.labelY}
            textAnchor={item.labelX < center - 8 ? 'end' : item.labelX > center + 8 ? 'start' : 'middle'}
            className="fill-slate-600 text-[11px] font-semibold"
          >
            {formatRadarLabel(item.knowledgePointName)}
          </text>
        ))}
      </svg>

      <div className="grid gap-3">
        {chartItems.map((item, index) => (
          <div key={item.knowledgePointId} className="rounded-[1.2rem] bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: radarPalette[index % radarPalette.length] }}
                />
                <p className="break-words font-semibold text-ink">{item.knowledgePointName}</p>
              </div>
              <span className="shrink-0 text-sm font-black text-brand-700">{item.mastery}%</span>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-slate-100">
              <div
                className="h-2.5 rounded-full bg-brand-500"
                style={{ width: `${clamp(item.mastery, 6, 100)}%` }}
              />
            </div>
            <p className="mt-2 break-words text-xs text-slate-500">
              {item.insight}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FamilyPage() {
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const [overview, setOverview] = useState<FamilyOverviewResult | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [showBindForm, setShowBindForm] = useState(false);

  const form = useForm<BindChildFormValues>({
    mode: 'onChange',
    defaultValues: {
      studentCode: '',
      studentPassword: '',
      relationLabel: relationOptions[0],
    },
  });

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const loadOverview = async () => {
      if (!accessToken || currentUser?.role !== 'PARENT') {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await familyService.getOverview(selectedChildId || undefined);
        setOverview(data);
        if (!selectedChildId && data.bindingOptions[0]) {
          setSelectedChildId(data.bindingOptions[0].student.id);
        }
      } catch (loadError) {
        if (selectedChildId) {
          setSelectedChildId('');
        }
        setError(loadError instanceof Error ? loadError.message : '家长端数据加载失败。');
      } finally {
        setLoading(false);
      }
    };

    void loadOverview();
  }, [accessToken, currentUser?.role, selectedChildId]);

  const handleBindChild = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError('');
    setFeedback('');

    try {
      const result = await familyService.bindChild({
        studentCode: values.studentCode.trim(),
        studentPassword: values.studentPassword,
        relationLabel: values.relationLabel,
      });
      setFeedback(result.nextStep);
      form.reset({
        studentCode: '',
        studentPassword: '',
        relationLabel: values.relationLabel,
      });
      setSelectedChildId(result.child.id);
      const refreshed = await familyService.getOverview(result.child.id);
      setOverview(refreshed);
      setShowBindForm(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '绑定孩子失败。');
    } finally {
      setSubmitting(false);
    }
  });

  const hasBinding = Boolean(overview?.bindingOptions.length);
  const shouldShowBindForm = !hasBinding || showBindForm;
  const chartCauseTotal = useMemo(
    () =>
      (overview?.wrongCauseBreakdown ?? []).reduce((sum, item) => sum + item.count, 0),
    [overview?.wrongCauseBreakdown],
  );

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="家长端" description="只看自己已绑定孩子的学习数据，聚焦近期问题与辅导建议。">
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'PARENT') {
    return (
      <PageShell title="家长端" description="只看自己已绑定孩子的学习数据，聚焦近期问题与辅导建议。">
        <PermissionDeniedState />
      </PageShell>
    );
  }

  if (error && !overview && !loading) {
    const kind = getPlatformErrorKind(error);
    return (
      <PageShell title="家长端" description="只看自己已绑定孩子的学习数据，聚焦近期问题与辅导建议。">
        {kind === 'session_expired' ? (
          <SessionExpiredState />
        ) : kind === 'network_error' ? (
          <NetworkErrorState />
        ) : (
          <PageLoadErrorState />
        )}
      </PageShell>
    );
  }

  return (
    <PageShell
      title="家长端"
      description="帮助家长快速看懂孩子最近学得怎么样、哪里偏弱、下一步该怎么陪练。"
      navItems={[
        { href: '/family', label: '孩子总览' },
        { href: '/student/ai-qa', label: 'AI 讲题' },
      ]}
    >
      {feedback ? (
        <div className="mb-4 rounded-[1.2rem] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {feedback}
        </div>
      ) : null}

      {error && overview ? (
        <div className="mb-4 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="portal-board px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="math-chip math-chip-primary">家长总览</span>
                {overview?.child ? (
                  <span className="math-chip math-chip-success">
                    {overview.child.displayName} · {overview.child.grade} 年级
                  </span>
                ) : null}
              </div>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">
                {overview?.child ? `${overview.child.displayName} 的学习画像` : '先绑定孩子，再查看学习画像'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                家长端只展示自己已绑定孩子的数据，不会混入其他学生信息。
              </p>
            </div>

            {hasBinding ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={selectedChildId}
                  onChange={(event) => setSelectedChildId(event.target.value)}
                  className="math-input min-w-[220px]"
                >
                  {overview?.bindingOptions.map((binding) => (
                    <option key={binding.id} value={binding.student.id}>
                      {binding.student.displayName} · {binding.student.className ?? '未分班'} · {binding.relationLabel}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowBindForm((current) => !current)}
                  className="math-button-secondary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700"
                >
                  {showBindForm ? '收起绑定' : '添加孩子'}
                </button>
              </div>
            ) : null}
          </div>

          {hasBinding && overview ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['总做题数', overview.summary.totalQuestions, 'text-brand-700'],
                ['正确率', `${overview.summary.accuracyRate}%`, 'text-[#2E7D32]'],
                ['待复习错题', overview.summary.unresolvedWrongCount, 'text-[#EF6C00]'],
                ['AI 讲题次数', overview.summary.aiQaCount, 'text-[#8E24AA]'],
              ].map(([label, value, tone]) => (
                <div key={String(label)} className="rounded-[1.4rem] bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className={`mt-3 font-math-display text-3xl font-extrabold ${tone}`}>{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-brand-200 bg-white px-5 py-5 text-sm leading-7 text-slate-600">
              绑定成功后，这里会显示孩子的总做题数、正确率、待复习错题和 AI 讲题次数。
            </div>
          )}
        </article>

        <article className="portal-board px-5 py-5 sm:px-6">
          <EinsteinTipCard
            tone="yellow"
            title="爱因导师给家长的建议"
            message={
              overview?.aiSummary.parentSuggestion ??
              '建议先绑定孩子账号。绑定后，系统会根据最近做题、错题和知识点掌握情况给出家长辅导建议。'
            }
          />

          {shouldShowBindForm ? (
            <form className="mt-5 space-y-4" onSubmit={handleBindChild}>
              {hasBinding ? (
                <div className="rounded-[1.2rem] bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
                  已绑定的孩子会继续保留。这里用于添加另一个孩子账号。
                </div>
              ) : null}
              <div>
                <label className="mb-2 block text-sm font-extrabold text-slate-700">学生学号</label>
                <input
                  {...form.register('studentCode', { required: '请输入学生学号' })}
                  className="math-input"
                  placeholder="请输入学生账号里的学号"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-extrabold text-slate-700">学生密码</label>
                <input
                  {...form.register('studentPassword', { required: '请输入学生密码' })}
                  type="password"
                  className="math-input"
                  placeholder="请输入学生当前登录密码"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-extrabold text-slate-700">关系</label>
                <select {...form.register('relationLabel', { required: true })} className="math-input">
                  {relationOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="math-button-primary w-full rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {submitting ? '正在绑定孩子...' : '绑定孩子并查看数据'}
              </button>
            </form>
          ) : null}
        </article>
      </section>

      {hasBinding && overview ? (
        <>
          <section className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="portal-board px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-math-display text-3xl font-extrabold text-ink">知识点掌握度雷达图</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    清楚看出孩子当前哪些知识点掌握稳定，哪些知识点需要优先补强。
                  </p>
                </div>
                {overview.knowledgeRadar[0] ? (
                  <span className="math-chip math-chip-warning">
                    当前薄弱项：{overview.knowledgeRadar[0].knowledgePointName}
                  </span>
                ) : null}
              </div>
              <div className="mt-5">
                <FamilyRadarChart items={overview.knowledgeRadar} />
              </div>
            </article>

            <article className="portal-board px-5 py-5 sm:px-6">
              <h3 className="font-math-display text-3xl font-extrabold text-ink">错题归因</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                这里帮助家长理解孩子最近错题更偏向概念问题、审题问题，还是计算细节问题。
              </p>
              <div className="mt-5 grid gap-3">
                {overview.wrongCauseBreakdown.map((item) => {
                  const percent =
                    chartCauseTotal === 0 ? 0 : Math.round((item.count / chartCauseTotal) * 100);

                  return (
                    <div key={item.label} className="rounded-[1.2rem] bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 break-words font-semibold text-ink">{item.label}</p>
                        <span className="shrink-0 text-sm font-black text-orange-600">{percent}%</span>
                      </div>
                      <div className="mt-3 h-2.5 rounded-full bg-slate-100">
                        <div
                          className="h-2.5 rounded-full bg-orange-400"
                          style={{ width: `${clamp(percent, item.count > 0 ? 10 : 0, 100)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs leading-6 text-slate-500">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <article className="portal-board px-5 py-5 sm:px-6">
              <h3 className="font-math-display text-3xl font-extrabold text-ink">薄弱知识点</h3>
              <div className="mt-5 grid gap-3">
                {overview.weakKnowledgePoints.map((item) => (
                  <div key={item.knowledgePointId} className="rounded-[1.3rem] bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 break-words font-semibold text-ink">{item.knowledgePointName}</p>
                      <span className="shrink-0 text-sm font-black text-orange-600">{item.correctRate}%</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      共练习 {item.total} 题，答错 {item.wrongCount} 题。
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="portal-board px-5 py-5 sm:px-6">
              <h3 className="font-math-display text-3xl font-extrabold text-ink">最近错题</h3>
              <div className="mt-5 grid gap-3">
                {overview.wrongQuestions.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-[1.3rem] bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
                    <p className="break-words font-semibold text-ink">{item.questionTitle}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      错题次数 {item.wrongCount}，当前状态：{item.unresolved ? '待复习' : '已完成复习'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.knowledgePointName}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="mt-6">
            <article className="portal-board px-5 py-5 sm:px-6">
              <h3 className="font-math-display text-3xl font-extrabold text-ink">AI 学习总结</h3>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[1.3rem] bg-white px-5 py-5 shadow-sm ring-1 ring-slate-100">
                  <p className="text-sm font-black tracking-[0.14em] text-brand-700">本周观察</p>
                  <p className="mt-3 text-base leading-8 text-slate-700">{overview.aiSummary.headline}</p>
                </div>
                <div className="rounded-[1.3rem] bg-white px-5 py-5 shadow-sm ring-1 ring-slate-100">
                  <p className="text-sm font-black tracking-[0.14em] text-brand-700">家长辅导建议</p>
                  <p className="mt-3 text-base leading-8 text-slate-700">{overview.aiSummary.parentSuggestion}</p>
                </div>
              </div>
            </article>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}
