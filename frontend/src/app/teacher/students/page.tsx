'use client';

import { useEffect, useMemo, useState } from 'react';
import { EinsteinTipCard } from '@/components/brand/einstein-tip-card';
import { PageShell } from '@/components/base/page-shell';
import {
  AuthRequiredState,
  NetworkErrorState,
  PageLoadErrorState,
  PermissionDeniedState,
  SessionExpiredState,
  TeacherPendingReviewState,
} from '@/components/states/platform-states';
import { getPlatformErrorKind } from '@/lib/platform-errors';
import {
  teacherService,
  type TeacherStudentListResult,
  type TeacherStudentReportResult,
} from '@/services/teacher.service';
import { useUserStore } from '@/store/use-user-store';

const teacherNavItems = [
  { href: '/teacher', label: '教师首页' },
  { href: '/teacher/students', label: '学生列表' },
];

function getAttentionLabel(accuracyRate: number, unresolvedWrongCount: number) {
  if (accuracyRate < 60 || unresolvedWrongCount >= 5) {
    return { text: '重点关注', tone: 'bg-[#FFE7E7] text-[#C62828]' };
  }

  if (accuracyRate < 80 || unresolvedWrongCount >= 2) {
    return { text: '建议跟进', tone: 'bg-[#FFF4E5] text-[#EF6C00]' };
  }

  return { text: '表现稳定', tone: 'bg-[#EAF7EC] text-[#2E7D32]' };
}

export default function TeacherStudentsPage() {
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const [data, setData] = useState<TeacherStudentListResult | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<TeacherStudentReportResult | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await teacherService.getStudents();
        setData(response);
        if (response.list[0]) {
          setSelectedStudentId(response.list[0].id);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '学生列表加载失败。');
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      return;
    }

    const loadReport = async () => {
      setLoadingReport(true);
      try {
        const report = await teacherService.getStudentReport(selectedStudentId);
        setSelectedReport(report);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '学生画像加载失败。');
      } finally {
        setLoadingReport(false);
      }
    };

    void loadReport();
  }, [selectedStudentId]);

  const overview = useMemo(() => {
    if (!data?.list.length) {
      return { total: 0, focusCount: 0, avgAccuracy: 0 };
    }

    const total = data.list.length;
    const focusCount = data.list.filter(
      (item) => item.accuracyRate < 80 || item.unresolvedWrongCount >= 2,
    ).length;
    const avgAccuracy = Math.round(
      data.list.reduce((sum, item) => sum + item.accuracyRate, 0) / total,
    );

    return { total, focusCount, avgAccuracy };
  }, [data]);

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="学生列表" description="按学生维度查看学情与 AI 学习画像。" navItems={teacherNavItems}>
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role === 'TEACHER' && currentUser.isActive === false) {
    return (
      <PageShell title="学生列表" description="按学生维度查看学情与 AI 学习画像。" navItems={teacherNavItems}>
        <TeacherPendingReviewState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'TEACHER') {
    return (
      <PageShell title="学生列表" description="按学生维度查看学情与 AI 学习画像。" navItems={teacherNavItems}>
        <PermissionDeniedState />
      </PageShell>
    );
  }

  if (error) {
    const kind = getPlatformErrorKind(error);
    return (
      <PageShell title="学生列表" description="按学生维度查看学情与 AI 学习画像。" navItems={teacherNavItems}>
        {kind === 'session_expired' ? (
          <SessionExpiredState />
        ) : kind === 'network_error' ? (
          <NetworkErrorState />
        ) : kind === 'permission_denied' ? (
          <PermissionDeniedState />
        ) : (
          <PageLoadErrorState />
        )}
      </PageShell>
    );
  }

  return (
    <PageShell
      title="学生列表"
      description="左侧快速切换学生，右侧查看 AI 学情分析、薄弱点、最近错题和教师建议。"
      navItems={teacherNavItems}
    >
      <section className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <aside className="math-card rounded-[2rem] px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">学生列表</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                先从左侧判断谁需要优先跟进，再查看右侧的 AI 学情画像。
              </p>
            </div>
            <div className="rounded-[1rem] bg-[#F7F9FF] px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-brand-100">
              共 {overview.total} 位学生
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              ['平均正确率', `${overview.avgAccuracy}%`, 'bg-[#EAF7EC] text-[#2E7D32]'],
              ['需重点跟进', overview.focusCount, 'bg-[#FFF4E5] text-[#EF6C00]'],
              ['总学生数', overview.total, 'bg-[#EEF1FF] text-brand-700'],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="rounded-[1.4rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className={`inline-flex rounded-[0.9rem] px-3 py-2 text-xs font-black ${tone}`}>
                  {label}
                </div>
                <p className="mt-4 font-math-display text-3xl font-extrabold text-ink">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {data?.list.map((item) => {
              const attention = getAttentionLabel(item.accuracyRate, item.unresolvedWrongCount);
              const active = selectedStudentId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedStudentId(item.id)}
                  className={`w-full rounded-[1.6rem] border px-5 py-5 text-left transition ${
                    active
                      ? 'border-brand-300 bg-[linear-gradient(180deg,#F8FBFF,#FFFFFF)] shadow-[0_16px_34px_rgba(63,81,181,0.12)]'
                      : 'border-slate-100 bg-white hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)]'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-math-display text-2xl font-extrabold text-ink">{item.displayName}</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                      {item.studentCode}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${attention.tone}`}>
                      {attention.text}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {item.grade} 年级 {item.className ?? '未分班'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <span className="rounded-full bg-[#EEF1FF] px-3 py-2 font-semibold text-brand-700">
                      累计做题 {item.totalQuestions}
                    </span>
                    <span className="rounded-full bg-[#EAF7EC] px-3 py-2 font-semibold text-[#2E7D32]">
                      正确率 {item.accuracyRate}%
                    </span>
                    <span className="rounded-full bg-[#FFF4E5] px-3 py-2 font-semibold text-[#EF6C00]">
                      待巩固错题 {item.unresolvedWrongCount}
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm leading-7 text-slate-600">{item.aiSummary}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <article className="math-card rounded-[2rem] px-6 py-6">
          {selectedReport ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">AI Student Insight</p>
                  <h2 className="mt-2 font-math-display text-3xl font-extrabold text-ink">
                    {selectedReport.student.displayName} 的学习画像
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedReport.student.studentCode} · {selectedReport.student.grade} 年级 ·{' '}
                    {selectedReport.student.className ?? '未分班'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentId(selectedReport.student.id)}
                  className="math-button-secondary rounded-[1rem] px-4 py-2 text-sm font-extrabold text-slate-700"
                >
                  {loadingReport ? '正在更新分析...' : '更新 AI 分析'}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ['总做题数', selectedReport.reportSummary.totalQuestions, 'bg-[#EEF1FF] text-brand-700'],
                  ['正确率', `${selectedReport.reportSummary.accuracyRate}%`, 'bg-[#EAF7EC] text-[#2E7D32]'],
                  ['未解决错题', selectedReport.reportSummary.unresolvedWrongCount, 'bg-[#FFF4E5] text-[#EF6C00]'],
                ].map(([label, value, tone]) => (
                  <div key={String(label)} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <div className={`inline-flex rounded-[0.9rem] px-3 py-2 text-xs font-black ${tone}`}>
                      {label}
                    </div>
                    <p className="mt-4 font-math-display text-3xl font-extrabold text-ink">{value}</p>
                  </div>
                ))}
              </div>

              <EinsteinTipCard message={selectedReport.aiLearningInsight.summary} tone="blue" />

              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <section className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
                  <h3 className="font-math-display text-2xl font-extrabold text-ink">AI 学情分析</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-sm font-black text-brand-700">优势表现</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-slate-600">
                        {selectedReport.aiLearningInsight.strengths.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#EF6C00]">主要薄弱点</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-slate-600">
                        {selectedReport.aiLearningInsight.weaknesses.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-black text-emerald-700">下一步建议</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-slate-600">
                        {selectedReport.aiLearningInsight.recommendations.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                <section className="grid gap-4">
                  <div className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
                    <h3 className="font-math-display text-2xl font-extrabold text-ink">薄弱知识点</h3>
                    <div className="mt-4 space-y-3">
                      {selectedReport.weakKnowledgePoints.slice(0, 4).map((item) => (
                        <div
                          key={item.knowledgePointId}
                          className="rounded-[1.2rem] bg-[linear-gradient(180deg,#FFF9EF,#FFFFFF)] px-4 py-4 ring-1 ring-[#F6D36A]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-ink">{item.knowledgePointName}</p>
                            <span className="text-xs font-black text-[#EF6C00]">错题 {item.wrongCount}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">当前正确率 {item.correctRate}%</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-brand-100 bg-white px-5 py-5 shadow-sm">
                    <h3 className="font-math-display text-2xl font-extrabold text-ink">最近错题</h3>
                    <div className="mt-4 space-y-3">
                      {selectedReport.recentWrongQuestions.slice(0, 4).map((item) => (
                        <div key={item.id} className="rounded-[1.2rem] bg-slate-50/80 px-4 py-4">
                          <p className="text-sm font-semibold leading-7 text-ink">{item.stem}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-[#FFF4E5] px-3 py-1 font-black text-[#EF6C00]">
                              错误 {item.wrongCount} 次
                            </span>
                            <span className="rounded-full bg-[#EEF1FF] px-3 py-1 font-black text-brand-700">
                              {item.knowledgePointName}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <section className="rounded-[1.6rem] border border-brand-100 bg-[linear-gradient(180deg,#F8FBFF,#FFFFFF)] px-5 py-5 shadow-sm">
                <h3 className="font-math-display text-2xl font-extrabold text-ink">教师跟进建议</h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[1.2rem] bg-white px-4 py-4">
                    <p className="text-sm font-black text-brand-700">优先关注</p>
                    <ul className="mt-2 space-y-2 text-sm leading-7 text-slate-600">
                      {selectedReport.teacherActions.teacherFocus.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[1.2rem] bg-white px-4 py-4">
                    <p className="text-sm font-black text-emerald-700">建议下一步</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      推荐先围绕
                      <span className="mx-1 font-extrabold text-ink">
                        {selectedReport.teacherActions.nextRecommendedKnowledgePoint ?? '当前薄弱知识点'}
                      </span>
                      进行讲评或小练习。
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {selectedReport.teacherActions.recommendationSummary}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-[1.8rem] border border-dashed border-brand-100 bg-white/70 px-6 py-10 text-center">
              <div>
                <h3 className="font-math-display text-3xl font-extrabold text-ink">选择一位学生</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  右侧将展示该学生的 AI 学情分析、薄弱知识点、最近错题和教师跟进建议。
                </p>
              </div>
            </div>
          )}
        </article>
      </section>
    </PageShell>
  );
}
