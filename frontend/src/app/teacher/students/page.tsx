'use client';

import { useEffect, useState } from 'react';
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

export default function TeacherStudentsPage() {
  const [data, setData] = useState<TeacherStudentListResult | null>(null);
  const [selectedReport, setSelectedReport] =
    useState<TeacherStudentReportResult | null>(null);
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
    try {
      const report = await teacherService.getStudentReport(studentId);
      setSelectedReport(report);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '学生报告加载失败');
    }
  };

  return (
    <PageShell
      title="教师端学生列表"
      description="这里展示教师端最小可交付学生列表，并预留查看学生学习报告入口。"
      navItems={teacherNavItems}
    >
      {error ? (
        <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card">
        <h2 className="text-2xl font-bold text-ink">学生列表</h2>
        <div className="mt-6 space-y-4">
          {data?.list.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-slate-100 bg-slate-50/80 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    {item.displayName} · {item.studentCode}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {item.grade} 年级 {item.className ?? '未分班'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    累计做题 {item.totalQuestions}，正确率 {item.accuracyRate}% ，待巩固错题{' '}
                    {item.unresolvedWrongCount}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handlePreviewReport(item.id)}
                  className="rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700"
                >
                  预览学生报告
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedReport ? (
        <section className="mt-8 rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card">
          <h2 className="text-2xl font-bold text-ink">学生报告预览</h2>
          <p className="mt-4 text-sm text-slate-600">
            {selectedReport.student.displayName} · {selectedReport.student.studentCode}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-sm text-slate-500">总做题数</p>
              <p className="mt-2 text-2xl font-bold text-brand-700">
                {selectedReport.reportSummary.totalQuestions}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-sm text-slate-500">正确率</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {selectedReport.reportSummary.accuracyRate}%
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-sm text-slate-500">未解决错题</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">
                {selectedReport.reportSummary.unresolvedWrongCount}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-600">
            {selectedReport.placeholder}
          </p>
        </section>
      ) : null}
    </PageShell>
  );
}
