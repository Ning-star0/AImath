'use client';

import { useEffect, useMemo, useState } from 'react';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
import { PageShell } from '@/components/base/page-shell';
import {
  teacherService,
  type TeacherStudentListResult,
  type TeacherStudentReportResult,
} from '@/services/teacher.service';

const teacherNavItems = [
  { href: '/teacher', label: '教师首页' },
  { href: '/teacher/students', label: '学生列表' },
];

const getAttentionLabel = (accuracyRate: number, unresolvedWrongCount: number) => {
  if (accuracyRate < 60 || unresolvedWrongCount >= 8) {
    return { text: '重点关注', tone: 'bg-[#FFE7E7] text-[#C62828]' };
  }

  if (accuracyRate < 80 || unresolvedWrongCount >= 4) {
    return { text: '建议跟进', tone: 'bg-[#FFF4E5] text-[#EF6C00]' };
  }

  return { text: '表现稳定', tone: 'bg-[#EAF7EC] text-[#2E7D32]' };
};

export default function TeacherStudentsPage() {
  const [data, setData] = useState<TeacherStudentListResult | null>(null);
  const [selectedReport, setSelectedReport] =
    useState<TeacherStudentReportResult | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await teacherService.getStudents();
        setData(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '学生列表加载失败');
      }
    };

    void load();
  }, []);

  const handlePreviewReport = async (studentId: string) => {
    setSelectedStudentId(studentId);
    try {
      const report = await teacherService.getStudentReport(studentId);
      setSelectedReport(report);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '学生报告加载失败');
    } finally {
      setSelectedStudentId(null);
    }
  };

  const overview = useMemo(() => {
    if (!data?.list.length) {
      return {
        total: 0,
        focusCount: 0,
        avgAccuracy: 0,
      };
    }

    const total = data.list.length;
    const focusCount = data.list.filter(
      (item) => item.accuracyRate < 80 || item.unresolvedWrongCount >= 4,
    ).length;
    const avgAccuracy = Math.round(
      data.list.reduce((sum, item) => sum + item.accuracyRate, 0) / total,
    );

    return {
      total,
      focusCount,
      avgAccuracy,
    };
  }, [data]);

  return (
    <PageShell
      title="教师端学生列表"
      description="按学生查看练习量、正确率和待巩固错题，把学生列表做成教师工作区的核心入口。"
      navItems={teacherNavItems}
    >
      {error ? (
        <div className="mb-6 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
                STUDENT OVERVIEW
              </p>
              <h2 className="mt-2 font-math-display text-3xl font-extrabold text-ink">
                学生列表不只是名单，而是班级跟进入口
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                老师可以先看整体，再点开具体学生报告。页面保留轻量判断信息，帮助快速定位重点关注对象。
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-[1.6rem] bg-[linear-gradient(180deg,#F8FBFF,#EFF5FF)] px-5 py-4 shadow-sm ring-1 ring-brand-100">
              <EinsteinMentor size="sm" mood="guide" badge="班级" />
              <div>
                <p className="font-math-display text-xl font-extrabold text-ink">教师提示</p>
                <p className="text-sm text-slate-600">优先看建议跟进与重点关注学生。</p>
              </div>
            </div>
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <h3 className="font-math-display text-2xl font-extrabold text-ink">列表速览</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              ['学生总数', overview.total, 'bg-[#EEF1FF] text-brand-700'],
              ['建议跟进', overview.focusCount, 'bg-[#FFF4E5] text-[#EF6C00]'],
              ['平均正确率', `${overview.avgAccuracy}%`, 'bg-[#EAF7EC] text-[#2E7D32]'],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-[1.4rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className={`inline-flex rounded-[0.9rem] px-3 py-2 text-xs font-black ${tone}`}>
                  {label}
                </div>
                <p className="mt-4 font-math-display text-3xl font-extrabold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-[2rem] bg-white/85 p-6 shadow-card ring-1 ring-white/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="font-math-display text-3xl font-extrabold text-ink">学生列表</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              这里保留可快速扫读的信息层级，让教师先判断学情，再决定是否深入查看学生报告。
            </p>
          </div>
          <div className="rounded-[1rem] bg-[#F7F9FF] px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-brand-100">
            共 {data?.total ?? 0} 位学生
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {data?.list.map((item) => {
            const attention = getAttentionLabel(item.accuracyRate, item.unresolvedWrongCount);
            const isLoading = selectedStudentId === item.id;

            return (
              <article
                key={item.id}
                className="rounded-[1.8rem] border border-slate-100 bg-[linear-gradient(180deg,#FFFFFF,#F8FAFF)] p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="font-math-display text-2xl font-extrabold text-ink">
                        {item.displayName}
                      </h4>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                        {item.studentCode}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${attention.tone}`}>
                        {attention.text}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {item.grade} 年级 {item.className ?? '未分班'}
                      {item.schoolName ? ` · ${item.schoolName}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="rounded-full bg-[#EEF1FF] px-3 py-2 font-semibold text-brand-700">
                        累计做题 {item.totalQuestions}
                      </div>
                      <div className="rounded-full bg-[#EAF7EC] px-3 py-2 font-semibold text-[#2E7D32]">
                        正确率 {item.accuracyRate}%
                      </div>
                      <div className="rounded-full bg-[#FFF4E5] px-3 py-2 font-semibold text-[#EF6C00]">
                        待巩固错题 {item.unresolvedWrongCount}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:items-end">
                    <button
                      type="button"
                      onClick={() => void handlePreviewReport(item.id)}
                      className="math-button-primary inline-flex rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white"
                    >
                      {isLoading ? '加载报告中...' : '预览学生报告'}
                    </button>
                    <p className="text-xs text-slate-500">
                      点击后在下方查看该学生的学习报告摘要
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedReport ? (
        <section className="mt-8 math-card rounded-[2rem] px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
                REPORT PREVIEW
              </p>
              <h3 className="mt-2 font-math-display text-3xl font-extrabold text-ink">
                {selectedReport.student.displayName} 的学习报告预览
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {selectedReport.student.studentCode} · {selectedReport.student.grade} 年级
                {' · '}
                {selectedReport.student.className ?? '未分班'}
              </p>
            </div>
            <div className="rounded-[1rem] bg-[#F7F9FF] px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-brand-100">
              这是教师端快速预览，不替代学生完整报告页
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              [
                '总做题数',
                selectedReport.reportSummary.totalQuestions,
                'bg-[#EEF1FF] text-brand-700',
              ],
              [
                '正确率',
                `${selectedReport.reportSummary.accuracyRate}%`,
                'bg-[#EAF7EC] text-[#2E7D32]',
              ],
              [
                '未解决错题',
                selectedReport.reportSummary.unresolvedWrongCount,
                'bg-[#FFF4E5] text-[#EF6C00]',
              ],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <div className={`inline-flex rounded-[0.9rem] px-3 py-2 text-xs font-black ${tone}`}>
                  {label}
                </div>
                <p className="mt-4 font-math-display text-3xl font-extrabold text-ink">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.6rem] bg-[linear-gradient(180deg,#F8FBFF,#F4F7FF)] px-5 py-5 ring-1 ring-brand-100">
            <p className="font-math-display text-2xl font-extrabold text-ink">教师阅读摘要</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{selectedReport.placeholder}</p>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
