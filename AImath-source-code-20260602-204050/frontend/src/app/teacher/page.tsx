'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/base/page-shell';
import { EinsteinTipCard } from '@/components/brand/einstein-tip-card';
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
  CLASS_NAME_OPTIONS,
  GRADE_OPTIONS,
  SCHOOL_OPTIONS,
  normalizeClassName,
} from '@/lib/school-options';
import {
  teacherService,
  type ManagedClassAssignment,
  type TeacherDashboardResult,
} from '@/services/teacher.service';
import { useUserStore } from '@/store/use-user-store';

const teacherNavItems = [
  { href: '/teacher', label: '教师首页' },
  { href: '/teacher/students', label: '学生列表' },
];

const createEmptyClass = (): ManagedClassAssignment => ({
  grade: 1,
  className: CLASS_NAME_OPTIONS[0],
  schoolName: SCHOOL_OPTIONS[0],
});

function getClassAccessText(status?: string) {
  if (status === 'APPROVED') {
    return '已获批，可查看授权班级学生';
  }
  if (status === 'PENDING') {
    return '审核中，请等待管理员处理';
  }
  if (status === 'REJECTED') {
    return '申请被驳回，请修改后重新提交';
  }
  return '尚未提交班级管理申请';
}

function getReviewBadge(status?: string) {
  if (status === 'APPROVED') {
    return '已通过';
  }
  if (status === 'PENDING') {
    return '待审核';
  }
  if (status === 'REJECTED') {
    return '已驳回';
  }
  return '未提交';
}

export default function TeacherPage() {
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const [data, setData] = useState<TeacherDashboardResult | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState<ManagedClassAssignment[]>([createEmptyClass()]);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const load = async () => {
    try {
      const response = await teacherService.getDashboard();
      setData(response);
      setError('');

      if (response.accessControl.requestedClasses.length > 0) {
        setClasses(
          response.accessControl.requestedClasses.map((item) => ({
            grade: item.grade,
            className: normalizeClassName(item.className) || CLASS_NAME_OPTIONS[0],
            schoolName: item.schoolName ?? SCHOOL_OPTIONS[0],
          })),
        );
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '教师端数据加载失败。');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleClassChange = (
    index: number,
    field: keyof ManagedClassAssignment,
    value: string | number,
  ) => {
    setClasses((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const addClassRow = () => {
    setClasses((current) => [...current, createEmptyClass()]);
  };

  const removeClassRow = (index: number) => {
    setClasses((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const submitClassRequest = async () => {
    const normalized = classes.map((item) => ({
      grade: Number(item.grade),
      className: item.className.trim(),
      schoolName: item.schoolName?.trim() || null,
    }));

    if (normalized.length === 0) {
      setError('请至少保留一个班级申请项。');
      return;
    }

    setSubmitting(true);
    setError('');
    setFeedback('');

    try {
      const response = await teacherService.submitClassAccessRequest({
        classes: normalized,
      });
      setFeedback(response.nextStep);
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '班级管理申请提交失败。');
    } finally {
      setSubmitting(false);
    }
  };

  const summaryCards = useMemo(
    () =>
      data
        ? [
            {
              label: '授权班级学生',
              value: data.classOverview.studentCount,
              detail: '仅统计已获批班级的学生人数',
              tone: 'bg-[#EEF1FF] text-brand-700',
            },
            {
              label: '累计做题量',
              value: data.classOverview.totalQuestions,
              detail: '覆盖练习、错题与复习记录',
              tone: 'bg-[#EAF7EC] text-[#2E7D32]',
            },
            {
              label: '班级正确率',
              value: `${data.classOverview.classAccuracyRate}%`,
              detail: '用于判断整体掌握情况',
              tone: 'bg-[#FFF4E5] text-[#EF6C00]',
            },
            {
              label: '待巩固错题',
              value: data.classOverview.unresolvedWrongCount,
              detail: '适合优先安排专项复习',
              tone: 'bg-[#F4EBFF] text-[#8E24AA]',
            },
          ]
        : [],
    [data],
  );

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="教师工作台" description="查看班级学情与学生进度。" navItems={teacherNavItems}>
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role === 'TEACHER' && currentUser.isActive === false) {
    return (
      <PageShell title="教师工作台" description="查看班级学情与学生进度。" navItems={teacherNavItems}>
        <TeacherPendingReviewState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'TEACHER') {
    return (
      <PageShell title="教师工作台" description="查看班级学情与学生进度。" navItems={teacherNavItems}>
        <PermissionDeniedState />
      </PageShell>
    );
  }

  if (error && !data) {
    const errorKind = getPlatformErrorKind(error);

    return (
      <PageShell title="教师工作台" description="查看班级学情与学生进度。" navItems={teacherNavItems}>
        {errorKind === 'session_expired' ? (
          <SessionExpiredState />
        ) : errorKind === 'network_error' ? (
          <NetworkErrorState />
        ) : errorKind === 'permission_denied' ? (
          <PermissionDeniedState />
        ) : (
          <PageLoadErrorState />
        )}
      </PageShell>
    );
  }

  const accessControl = data?.accessControl;
  const canViewStudents = accessControl?.canViewStudents ?? false;

  return (
    <PageShell
      title="教师工作台"
      description="先确认自己负责的班级，审核通过后再查看对应班级学生信息与 AI 学情分析。"
      navItems={teacherNavItems}
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

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <p className="math-section-label">Teacher Workspace</p>
          <h2 className="mt-4 font-math-display text-3xl font-extrabold text-ink">
            先申请班级权限，再进入学生管理
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            新教师注册后只能完成基础登录。提交班级管理申请并通过管理员审核后，才可以查看对应班级学生的学习数据。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-[1rem] bg-[#F8FBFF] px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-brand-100">
              当前状态：{getClassAccessText(accessControl?.classAccessStatus)}
            </span>
            <Link
              href="/teacher/students"
              className={`inline-flex rounded-[1rem] px-5 py-3 text-sm font-extrabold ${
                canViewStudents
                  ? 'math-button-primary text-white'
                  : 'border border-[#D8E6FF] bg-white text-slate-400'
              }`}
            >
              查看学生列表
            </Link>
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <EinsteinTipCard
            tone="blue"
            message={
              canViewStudents
                ? '系统会根据学生做题、错题与知识点表现持续更新 AI 学情画像，方便你判断谁需要优先跟进。'
                : '先提交班级管理申请。管理员审核通过后，系统才会开放对应班级的学生列表与 AI 学情分析。'
            }
          />
        </article>
      </section>

      {canViewStudents ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <article key={card.label} className="math-card rounded-[1.7rem] px-5 py-5">
                <div className={`inline-flex rounded-[1rem] px-3 py-2 text-xs font-black ${card.tone}`}>
                  {card.label}
                </div>
                <p className="mt-4 font-math-display text-4xl font-extrabold text-ink">{card.value}</p>
                <p className="mt-2 text-sm text-slate-500">{card.detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <article className="math-card rounded-[2rem] px-6 py-6">
              <h3 className="font-math-display text-3xl font-extrabold text-ink">已授权班级</h3>
              <div className="mt-5 flex flex-wrap gap-3">
                {(accessControl?.approvedClasses ?? []).map((item) => (
                  <span
                    key={`${item.grade}-${item.className}-${item.schoolName ?? ''}`}
                    className="rounded-full bg-[#EEF4FF] px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    {item.grade} 年级 {normalizeClassName(item.className)}
                    {item.schoolName ? ` · ${item.schoolName}` : ''}
                  </span>
                ))}
              </div>
            </article>

            <article className="math-card rounded-[2rem] px-6 py-6">
              <h3 className="font-math-display text-3xl font-extrabold text-ink">下一步工作</h3>
              <Link
                href="/teacher/students"
                className="mt-5 block rounded-[1.5rem] border border-[#DDE8FF] bg-[#F8FBFF] px-5 py-5 transition hover:-translate-y-1 hover:shadow-md"
              >
                <p className="font-math-display text-2xl font-extrabold text-ink">进入学生列表</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  从授权班级中快速找到重点学生，再查看 AI 学情画像、最近错题和教师跟进建议。
                </p>
              </Link>
            </article>
          </section>
        </>
      ) : (
        <section className="mt-8 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <article className="math-card rounded-[2rem] px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-math-display text-3xl font-extrabold text-ink">提交班级管理申请</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  请填写你要负责的班级。管理员审核通过后，你才能查看对应班级学生的信息。
                </p>
              </div>
              <button
                type="button"
                onClick={addClassRow}
                className="math-button-secondary rounded-[1rem] px-4 py-2 text-sm font-extrabold text-slate-700"
              >
                添加班级
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {classes.map((item, index) => (
                <div
                  key={`${index}-${item.grade}-${item.className}-${item.schoolName ?? ''}`}
                  className="grid gap-3 rounded-[1.5rem] border border-slate-100 bg-white px-4 py-4 md:grid-cols-[110px_1fr_1fr_90px]"
                >
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-500">年级</span>
                    <select
                      value={item.grade}
                      onChange={(event) =>
                        handleClassChange(index, 'grade', Number(event.target.value))
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

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-500">班级名称</span>
                    <select
                      value={item.className}
                      onChange={(event) =>
                        handleClassChange(index, 'className', event.target.value)
                      }
                      className="math-input"
                    >
                      {CLASS_NAME_OPTIONS.map((className) => (
                        <option key={className} value={className}>
                          {item.grade} 年级 {className}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-500">学校名称</span>
                    <select
                      value={item.schoolName ?? SCHOOL_OPTIONS[0]}
                      onChange={(event) =>
                        handleClassChange(index, 'schoolName', event.target.value)
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

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeClassRow(index)}
                      disabled={classes.length === 1}
                      className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-600 disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void submitClassRequest()}
                disabled={submitting}
                className="math-button-primary rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {submitting ? '提交中...' : '提交班级管理申请'}
              </button>
            </div>
          </article>

          <article className="math-card rounded-[2rem] px-6 py-6">
            <h3 className="font-math-display text-3xl font-extrabold text-ink">当前申请状态</h3>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] bg-[#F8FBFF] px-5 py-5">
                <p className="text-sm font-bold text-brand-700">审核状态</p>
                <p className="mt-2 text-lg font-extrabold text-ink">
                  {getReviewBadge(accessControl?.classAccessStatus)}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {accessControl?.classAccessNote ??
                    '提交后管理员会审核你申请管理的班级，并决定你能查看哪些班级学生。'}
                </p>
              </div>

              {(accessControl?.requestedClasses ?? []).length > 0 ? (
                <div className="rounded-[1.5rem] bg-white px-5 py-5 ring-1 ring-slate-100">
                  <p className="text-sm font-bold text-brand-700">已提交班级</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(accessControl?.requestedClasses ?? []).map((item) => (
                      <span
                        key={`${item.grade}-${item.className}-${item.schoolName ?? ''}`}
                        className="rounded-full bg-[#EEF4FF] px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        {item.grade} 年级 {normalizeClassName(item.className)}
                        {item.schoolName ? ` · ${item.schoolName}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        </section>
      )}
    </PageShell>
  );
}
