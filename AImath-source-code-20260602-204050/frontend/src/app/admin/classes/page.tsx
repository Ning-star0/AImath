'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/base/page-shell';
import {
  AuthRequiredState,
  NetworkErrorState,
  PageLoadErrorState,
  PermissionDeniedState,
  SessionExpiredState,
} from '@/components/states/platform-states';
import { getPlatformErrorKind } from '@/lib/platform-errors';
import {
  GRADE_OPTIONS,
  SCHOOL_OPTIONS,
  getClassOptionsByGrade,
  normalizeClassName,
} from '@/lib/school-options';
import { adminService, type AdminClassesResult } from '@/services/admin.service';
import { useUserStore } from '@/store/use-user-store';

const adminNavItems = [
  { href: '/admin', label: '管理首页' },
  { href: '/admin/classes', label: '班级管理' },
  { href: '/admin/governance', label: '治理日志' },
  { href: '/admin/questions', label: '题库管理' },
  { href: '/admin/users', label: '用户列表' },
];

type EditingStudentState = {
  id: string;
  displayName: string;
  grade: number;
  className: string;
  schoolName: string;
};

export default function AdminClassesPage() {
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const [data, setData] = useState<AdminClassesResult | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [editingStudent, setEditingStudent] = useState<EditingStudentState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const load = async () => {
    try {
      const response = await adminService.getClasses();
      setData(response);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '班级管理加载失败。');
    }
  };

  useEffect(() => {
    if (accessToken) {
      void load();
    }
  }, [accessToken]);

  const editingClassOptions = useMemo(
    () => getClassOptionsByGrade(editingStudent?.grade ?? null),
    [editingStudent?.grade],
  );

  const openEditor = (
    studentId: string,
    displayName: string,
    currentGrade: number,
    currentClassName: string,
    currentSchoolName?: string | null,
  ) => {
    setEditingStudent({
      id: studentId,
      displayName,
      grade: currentGrade,
      className: normalizeClassName(currentClassName),
      schoolName: currentSchoolName ?? SCHOOL_OPTIONS[0],
    });
  };

  const handleSubmit = async () => {
    if (!editingStudent) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await adminService.assignStudentToClass(editingStudent.id, {
        grade: editingStudent.grade,
        className: editingStudent.className,
        schoolName: editingStudent.schoolName || null,
      });

      setFeedback(
        `已将 ${response.displayName} 调整到 ${response.grade} 年级 ${response.className}。`,
      );
      setEditingStudent(null);
      await load();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : '调整班级失败。');
    } finally {
      setSubmitting(false);
    }
  };

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="班级管理" description="查看班级归属、分配学生和核对教师覆盖班级。" navItems={adminNavItems}>
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'ADMIN') {
    return (
      <PageShell title="班级管理" description="查看班级归属、分配学生和核对教师覆盖班级。" navItems={adminNavItems}>
        <PermissionDeniedState />
      </PageShell>
    );
  }

  if (error && !data) {
    const kind = getPlatformErrorKind(error);
    return (
      <PageShell title="班级管理" description="查看班级归属、分配学生和核对教师覆盖班级。" navItems={adminNavItems}>
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
      title="班级管理"
      description="学生在注册时选择班级；如需后续调整，由管理员在这里统一修改。"
      navItems={adminNavItems}
    >
      {feedback ? (
        <div className="mb-4 rounded-[1.2rem] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {feedback}
        </div>
      ) : null}
      {error && data ? (
        <div className="mb-4 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : null}

      {editingStudent ? (
        <section className="math-card mb-6 rounded-[2rem] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">调整班级</p>
              <h2 className="mt-2 font-math-display text-3xl font-extrabold text-ink">
                {editingStudent.displayName}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                学生端不提供自行修改班级入口，如需转班、升年级或调整学校，由管理员统一处理。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingStudent(null)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600"
            >
              取消
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-slate-700">学校</span>
              <select
                value={editingStudent.schoolName}
                onChange={(event) =>
                  setEditingStudent((current) =>
                    current ? { ...current, schoolName: event.target.value } : current,
                  )
                }
                className="math-input"
              >
                {SCHOOL_OPTIONS.map((schoolName) => (
                  <option key={schoolName} value={schoolName}>
                    {schoolName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-slate-700">年级</span>
              <select
                value={editingStudent.grade}
                onChange={(event) =>
                  setEditingStudent((current) =>
                    current
                      ? {
                          ...current,
                          grade: Number(event.target.value),
                          className: getClassOptionsByGrade(Number(event.target.value))[0]?.value ?? current.className,
                        }
                      : current,
                  )
                }
                className="math-input"
              >
                {GRADE_OPTIONS.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade} 年级
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-slate-700">班级</span>
              <select
                value={editingStudent.className}
                onChange={(event) =>
                  setEditingStudent((current) =>
                    current ? { ...current, className: event.target.value } : current,
                  )
                }
                className="math-input"
              >
                {editingClassOptions.map((classItem) => (
                  <option key={classItem.value} value={classItem.value}>
                    {classItem.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="math-button-primary rounded-[1.1rem] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? '正在保存...' : '保存班级调整'}
            </button>
            <p className="text-sm text-slate-500">调整完成后，学生首页、教师授权班级和家长视图会按新班级归属更新。</p>
          </div>
        </section>
      ) : null}

      <section className="math-card rounded-[2rem] px-6 py-6">
        <h2 className="font-math-display text-3xl font-extrabold text-ink">班级列表</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          当前共 {data?.total ?? 0} 个班级。点击学生标签即可直接打开班级调整面板。
        </p>

        <div className="mt-6 space-y-4">
          {data?.list.map((classItem) => (
            <article key={classItem.key} className="rounded-[1.6rem] border border-slate-100 bg-white px-5 py-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-math-display text-2xl font-extrabold text-ink">
                      {classItem.grade} 年级 · {classItem.className}
                    </h3>
                    {classItem.schoolName ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {classItem.schoolName}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-[#EEF1FF] px-3 py-1 text-xs font-black text-brand-700">
                      学生 {classItem.studentCount} 人
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-bold text-brand-700">学生名单</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {classItem.students.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() =>
                            openEditor(
                              student.id,
                              student.displayName,
                              classItem.grade,
                              classItem.className,
                              classItem.schoolName,
                            )
                          }
                          className="rounded-full bg-[#F8FBFF] px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-brand-100 transition hover:-translate-y-0.5 hover:bg-[#EEF4FF]"
                        >
                          {student.displayName} · {student.studentCode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="min-w-[260px] rounded-[1.4rem] bg-[#FFFDF4] px-4 py-4 ring-1 ring-[#F3E4A6]">
                  <p className="text-sm font-bold text-[#EF6C00]">已授权教师</p>
                  <div className="mt-2 space-y-2">
                    {classItem.assignedTeachers.length > 0 ? (
                      classItem.assignedTeachers.map((teacher) => (
                        <div key={teacher.id} className="rounded-[1rem] bg-white px-3 py-3 text-sm text-slate-600">
                          {teacher.displayName} · {teacher.teacherCode ?? '未填写工号'}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1rem] bg-white px-3 py-3 text-sm text-slate-500">
                        当前还没有教师获批管理这个班级。
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
