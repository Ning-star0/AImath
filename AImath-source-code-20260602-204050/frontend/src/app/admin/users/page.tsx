'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/base/page-shell';
import {
  AuthRequiredState,
  NetworkErrorState,
  PageLoadErrorState,
  PermissionDeniedState,
  SessionExpiredState,
} from '@/components/states/platform-states';
import { getPlatformErrorKind } from '@/lib/platform-errors';
import { normalizeClassName } from '@/lib/school-options';
import { adminService, type AdminUsersResult } from '@/services/admin.service';
import type { ManagedClassAssignment } from '@/services/teacher.service';
import { useUserStore } from '@/store/use-user-store';

const adminNavItems = [
  { href: '/admin', label: '管理首页' },
  { href: '/admin/classes', label: '班级管理' },
  { href: '/admin/governance', label: '治理日志' },
  { href: '/admin/questions', label: '题库管理' },
  { href: '/admin/users', label: '用户列表' },
];

const roleLabelMap: Record<string, string> = {
  STUDENT: '学生',
  TEACHER: '教师',
  ADMIN: '管理员',
};

const reviewToneMap: Record<string, string> = {
  PENDING: 'bg-[#FFF4E5] text-[#EF6C00]',
  APPROVED: 'bg-[#EAF7EC] text-[#2E7D32]',
  REJECTED: 'bg-red-50 text-red-600',
  NOT_SUBMITTED: 'bg-slate-100 text-slate-500',
};

const reviewLabelMap: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  NOT_SUBMITTED: '未提交',
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const classListToText = (items: ManagedClassAssignment[]) =>
  items.map((item) => `${item.grade}|${item.className}|${item.schoolName ?? ''}`).join('\n');

const parseClassText = (value: string): ManagedClassAssignment[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [gradeText, className, schoolName] = line.split('|').map((item) => item.trim());
      return {
        grade: Number(gradeText),
        className: normalizeClassName(className),
        schoolName: schoolName || null,
      };
    })
    .filter((item) => item.grade >= 1 && item.grade <= 6 && item.className);

export default function AdminUsersPage() {
  const router = useRouter();
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const [data, setData] = useState<AdminUsersResult | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [reviewingUserId, setReviewingUserId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [teacherReviewFilter, setTeacherReviewFilter] = useState<string | null>(null);
  const [teacherClassAccessFilter, setTeacherClassAccessFilter] = useState<string | null>(null);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setRoleFilter(params.get('role'));
      setTeacherReviewFilter(params.get('teacherReviewStatus'));
      setTeacherClassAccessFilter(params.get('teacherClassAccessStatus'));
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const goTo = (href: string) => {
    const params = new URL(href, 'http://localhost').searchParams;
    setRoleFilter(params.get('role'));
    setTeacherReviewFilter(params.get('teacherReviewStatus'));
    setTeacherClassAccessFilter(params.get('teacherClassAccessStatus'));
    router.push(href);
  };

  const load = async () => {
    try {
      const response = await adminService.getUsers();
      setData(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '用户列表加载失败。');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredList = useMemo(
    () =>
      data?.list.filter((item) => {
        if (roleFilter && item.role !== roleFilter) {
          return false;
        }
        if (teacherReviewFilter && item.teacherReviewStatus !== teacherReviewFilter) {
          return false;
        }
        if (
          teacherClassAccessFilter &&
          item.teacherClassAccessStatus !== teacherClassAccessFilter
        ) {
          return false;
        }
        return true;
      }) ?? [],
    [data, roleFilter, teacherReviewFilter, teacherClassAccessFilter],
  );

  const pendingTeachers = useMemo(
    () =>
      data?.list.filter(
        (item) => item.role === 'TEACHER' && item.teacherReviewStatus === 'PENDING',
      ) ?? [],
    [data],
  );

  const pendingClassAccess = useMemo(
    () =>
      data?.list.filter(
        (item) =>
          item.role === 'TEACHER' &&
          item.teacherReviewStatus === 'APPROVED' &&
          item.teacherClassAccessStatus === 'PENDING',
      ) ?? [],
    [data],
  );

  const handleDeleteUser = async (userId: string, displayName: string) => {
    const confirmed = window.confirm(`确认删除账号"${displayName}"吗？删除后会同时清理关联学习记录。`);
    if (!confirmed) {
      return;
    }

    setDeletingUserId(userId);
    setFeedback('');
    setError('');

    try {
      const response = await adminService.deleteUser(userId);
      setData((current) =>
        current
          ? {
              ...current,
              total: current.total - 1,
              list: current.list.filter((item) => item.id !== userId),
            }
          : current,
      );
      setFeedback(
        `已删除账号"${response.deletedUser.displayName}"，并清理练习 ${response.cleanupSummary.exerciseRecordCount} 条、错题 ${response.cleanupSummary.wrongQuestionCount} 条。`,
      );
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除账号失败。');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleReviewTeacher = async (
    userId: string,
    displayName: string,
    decision: 'APPROVED' | 'REJECTED',
  ) => {
    const note =
      window.prompt(
        decision === 'APPROVED'
          ? `可填写"${displayName}"的审核备注（可选）`
          : `请填写驳回"${displayName}"的原因（可选）`,
      ) ?? '';

    setReviewingUserId(userId);
    setFeedback('');
    setError('');

    try {
      const response = await adminService.reviewTeacher(userId, {
        decision,
        note: note.trim() || undefined,
      });

      setData((current) =>
        current
          ? {
              ...current,
              list: current.list.map((item) =>
                item.id === userId
                  ? {
                      ...item,
                      isActive: response.isActive,
                      teacherReviewStatus: response.reviewStatus,
                      teacherReviewNote: response.reviewNote,
                    }
                  : item,
              ),
            }
          : current,
      );
      setFeedback(response.nextStep);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : '教师审核失败。');
    } finally {
      setReviewingUserId(null);
    }
  };

  const handleReviewClassAccess = async (
    userId: string,
    displayName: string,
    requestedClasses: ManagedClassAssignment[],
    decision: 'APPROVED' | 'REJECTED',
  ) => {
    let approvedClasses: ManagedClassAssignment[] | undefined;
    if (decision === 'APPROVED') {
      const classText =
        window.prompt(
          `请确认"${displayName}"获批管理的班级。\n每行格式：年级|班级名称|学校名称`,
          classListToText(requestedClasses),
        ) ?? '';
      approvedClasses = parseClassText(classText);
      if (approvedClasses.length === 0) {
        setError('审核通过时至少需要保留一个有效班级。');
        return;
      }
    }

    const note =
      window.prompt(
        decision === 'APPROVED'
          ? `可填写"${displayName}"的班级权限审核备注（可选）`
          : `请填写驳回"${displayName}"班级权限申请的原因（可选）`,
      ) ?? '';

    setReviewingUserId(userId);
    setFeedback('');
    setError('');

    try {
      const response = await adminService.reviewTeacherClassAccess(userId, {
        decision,
        note: note.trim() || undefined,
        approvedClasses,
      });
      setData((current) =>
        current
          ? {
              ...current,
              list: current.list.map((item) =>
                item.id === userId
                  ? {
                      ...item,
                      teacherClassAccessStatus: response.classAccessStatus,
                      teacherClassAccessNote: response.classAccessNote,
                      requestedClasses: response.requestedClasses,
                      approvedClasses: response.approvedClasses,
                    }
                  : item,
              ),
            }
          : current,
      );
      setFeedback(response.nextStep);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : '班级权限审核失败。');
    } finally {
      setReviewingUserId(null);
    }
  };

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="用户列表" description="查看账号、审核教师与分配班级权限。" navItems={adminNavItems}>
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'ADMIN') {
    return (
      <PageShell title="用户列表" description="查看账号、审核教师与分配班级权限。" navItems={adminNavItems}>
        <PermissionDeniedState />
      </PageShell>
    );
  }

  if (error && !data) {
    const kind = getPlatformErrorKind(error);
    return (
      <PageShell title="用户列表" description="查看账号、审核教师与分配班级权限。" navItems={adminNavItems}>
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
      title="用户列表"
      description="在这里审核教师账号、审核班级权限、查看角色分布并治理平台账号。"
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

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <h2 className="font-math-display text-3xl font-extrabold text-ink">教师账号审核</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            新教师注册后先在这里完成基础账号审核，审核通过后教师才可以登录并提交班级管理申请。
          </p>
          <div className="mt-5 space-y-4">
            {pendingTeachers.length > 0 ? (
              pendingTeachers.map((teacher) => (
                <article key={teacher.id} className="rounded-[1.5rem] border border-[#F3E4A6] bg-white px-5 py-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-math-display text-2xl font-extrabold text-ink">
                          {teacher.displayName}
                        </h3>
                        <span className="rounded-full bg-[#FFF4E5] px-3 py-1 text-xs font-black text-[#EF6C00]">
                          待审核
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-2">
                          工号：{teacher.teacherCode ?? '-'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-2">
                          学校：{teacher.schoolName ?? '未填写'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-2">
                          学科：{teacher.subject ?? '未填写'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleReviewTeacher(teacher.id, teacher.displayName, 'APPROVED')}
                        disabled={reviewingUserId === teacher.id}
                        className="math-button-primary rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
                      >
                        {reviewingUserId === teacher.id ? '处理中...' : '审核通过'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReviewTeacher(teacher.id, teacher.displayName, 'REJECTED')}
                        disabled={reviewingUserId === teacher.id}
                        className="rounded-[1rem] border border-red-200 bg-red-50 px-5 py-3 text-sm font-extrabold text-red-600 disabled:opacity-60"
                      >
                        驳回申请
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-5 py-5 text-sm text-slate-500">
                当前没有待审核的教师基础账号。
              </div>
            )}
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <h2 className="font-math-display text-3xl font-extrabold text-ink">班级权限审核</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            教师登录后提交班级管理申请，管理员在这里确认教师能管理哪些班级。
          </p>
          <div className="mt-5 space-y-4">
            {pendingClassAccess.length > 0 ? (
              pendingClassAccess.map((teacher) => (
                <article key={teacher.id} className="rounded-[1.5rem] border border-[#DDE8FF] bg-white px-5 py-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-math-display text-2xl font-extrabold text-ink">
                        {teacher.displayName}
                      </h3>
                      <span className="rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-brand-700">
                        班级权限待审核
                      </span>
                    </div>
                    <div className="rounded-[1.2rem] bg-[#F8FBFF] px-4 py-4">
                      <p className="text-sm font-bold text-brand-700">申请管理班级</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(teacher.requestedClasses ?? []).map((item) => (
                          <span key={`${item.grade}-${item.className}-${item.schoolName ?? ''}`} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-brand-100">
                            {item.grade} 年级 · {item.className}
                            {item.schoolName ? ` · ${item.schoolName}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          void handleReviewClassAccess(
                            teacher.id,
                            teacher.displayName,
                            teacher.requestedClasses ?? [],
                            'APPROVED',
                          )
                        }
                        disabled={reviewingUserId === teacher.id}
                        className="math-button-primary rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
                      >
                        {reviewingUserId === teacher.id ? '处理中...' : '审核并分配班级'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleReviewClassAccess(
                            teacher.id,
                            teacher.displayName,
                            teacher.requestedClasses ?? [],
                            'REJECTED',
                          )
                        }
                        disabled={reviewingUserId === teacher.id}
                        className="rounded-[1rem] border border-red-200 bg-red-50 px-5 py-3 text-sm font-extrabold text-red-600 disabled:opacity-60"
                      >
                        驳回班级申请
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-5 py-5 text-sm text-slate-500">
                当前没有待审核的班级权限申请。
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-[2rem] bg-white p-6 shadow-card ring-1 ring-white/70">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-math-display text-3xl font-extrabold text-ink">平台账号</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              支持按角色和审核状态查看账号，同时可删除非当前管理员账号。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['全部', '/admin/users'],
              ['学生', '/admin/users?role=STUDENT'],
              ['教师', '/admin/users?role=TEACHER'],
              ['管理员', '/admin/users?role=ADMIN'],
            ].map(([label, href]) => (
              <button
                key={label}
                type="button"
                onClick={() => goTo(href)}
                className="math-button-secondary rounded-[1rem] px-4 py-2 text-sm font-extrabold text-slate-700"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {filteredList.map((item) => {
            const isCurrentUser = currentUser?.id === item.id;
            return (
              <article
                key={item.id}
                className="rounded-[1.8rem] border border-slate-100 bg-white px-5 py-5 shadow-sm"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-math-display text-2xl font-extrabold text-ink">{item.displayName}</h3>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {roleLabelMap[item.role] ?? item.role}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          item.isActive ? 'bg-[#EAF7EC] text-[#2E7D32]' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.isActive ? '已启用' : '未激活'}
                      </span>
                      {item.teacherReviewStatus ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${reviewToneMap[item.teacherReviewStatus] ?? 'bg-slate-100 text-slate-500'}`}>
                          教师审核：{reviewLabelMap[item.teacherReviewStatus] ?? item.teacherReviewStatus}
                        </span>
                      ) : null}
                      {item.teacherClassAccessStatus ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${reviewToneMap[item.teacherClassAccessStatus] ?? 'bg-slate-100 text-slate-500'}`}>
                          班级权限：{reviewLabelMap[item.teacherClassAccessStatus] ?? item.teacherClassAccessStatus}
                        </span>
                      ) : null}
                      {isCurrentUser ? (
                        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
                          当前账号
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-2">用户名：{item.username}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-2">
                        学生编号：{item.studentCode ?? '-'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-2">
                        教师工号：{item.teacherCode ?? '-'}
                      </span>
                    </div>

                    {item.approvedClasses && item.approvedClasses.length > 0 ? (
                      <div>
                        <p className="text-sm font-bold text-brand-700">已分配班级</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.approvedClasses.map((classItem) => (
                            <span
                              key={`${classItem.grade}-${classItem.className}-${classItem.schoolName ?? ''}`}
                              className="rounded-full bg-[#EEF4FF] px-3 py-2 text-xs font-semibold text-slate-700"
                            >
                              {classItem.grade} 年级 · {classItem.className}
                              {classItem.schoolName ? ` · ${classItem.schoolName}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {item.teacherReviewNote ? (
                      <p className="text-sm leading-7 text-slate-500">教师审核备注：{item.teacherReviewNote}</p>
                    ) : null}
                    {item.teacherClassAccessNote ? (
                      <p className="text-sm leading-7 text-slate-500">班级权限备注：{item.teacherClassAccessNote}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 xl:items-end">
                    <div className="rounded-[1.4rem] bg-[#F8FAFF] px-4 py-4 text-sm text-slate-500 ring-1 ring-slate-100">
                      <p>创建时间</p>
                      <p className="mt-2 font-semibold text-ink">{formatDate(item.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={isCurrentUser || deletingUserId === item.id}
                      onClick={() => void handleDeleteUser(item.id, item.displayName)}
                      className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingUserId === item.id ? '删除中...' : '删除账号'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
