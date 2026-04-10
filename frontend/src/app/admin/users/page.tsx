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
import { adminService, type AdminUsersResult } from '@/services/admin.service';
import { useUserStore } from '@/store/use-user-store';

const adminNavItems = [
  { href: '/admin', label: '管理首页' },
  { href: '/admin/questions', label: '题库管理' },
  { href: '/admin/users', label: '用户列表' },
];

const roleLabelMap: Record<string, string> = {
  STUDENT: '学生',
  TEACHER: '教师',
  ADMIN: '管理员',
};

const roleToneMap: Record<string, string> = {
  STUDENT: 'bg-[#EEF1FF] text-brand-700',
  TEACHER: 'bg-[#EAF7EC] text-[#2E7D32]',
  ADMIN: 'bg-[#FFF4E5] text-[#EF6C00]',
};

const teacherReviewToneMap: Record<string, string> = {
  PENDING: 'bg-[#FFF4E5] text-[#EF6C00]',
  APPROVED: 'bg-[#EAF7EC] text-[#2E7D32]',
  REJECTED: 'bg-red-50 text-red-600',
};

const teacherReviewLabelMap: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
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

export default function AdminUsersPage() {
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const [data, setData] = useState<AdminUsersResult | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [reviewingUserId, setReviewingUserId] = useState<string | null>(null);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

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

  const overview = useMemo(() => {
    if (!data?.list.length) {
      return {
        total: 0,
        activeCount: 0,
        studentCount: 0,
        teacherCount: 0,
        pendingTeacherCount: 0,
      };
    }

    return {
      total: data.total,
      activeCount: data.list.filter((item) => item.isActive).length,
      studentCount: data.list.filter((item) => item.role === 'STUDENT').length,
      teacherCount: data.list.filter((item) => item.role === 'TEACHER').length,
      pendingTeacherCount: data.list.filter(
        (item) => item.role === 'TEACHER' && item.teacherReviewStatus === 'PENDING',
      ).length,
    };
  }, [data]);

  const pendingTeachers = useMemo(
    () => data?.list.filter((item) => item.role === 'TEACHER' && item.teacherReviewStatus === 'PENDING') ?? [],
    [data],
  );

  const handleDeleteUser = async (userId: string, displayName: string) => {
    const confirmed = window.confirm(`确认删除账号“${displayName}”吗？删除后将一并清理该账号的学习记录。`);

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
              total: current.total - 1,
              list: current.list.filter((item) => item.id !== userId),
            }
          : current,
      );
      setFeedback(
        `已删除账号“${response.deletedUser.displayName}”。相关练习记录 ${response.cleanupSummary.exerciseRecordCount} 条、错题 ${response.cleanupSummary.wrongQuestionCount} 条已同步清理。`,
      );
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除账号失败，请稍后再试。');
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
      decision === 'REJECTED'
        ? window.prompt(`请输入驳回“${displayName}”的原因（可选）：`) ?? ''
        : window.prompt(`如需补充备注，可填写“${displayName}”的审核说明（可选）：`) ?? '';

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
      setError(reviewError instanceof Error ? reviewError.message : '教师审核失败，请稍后再试。');
    } finally {
      setReviewingUserId(null);
    }
  };

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="用户列表" description="统一查看平台账号、角色与审核状态。">
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'ADMIN') {
    return (
      <PageShell title="用户列表" description="统一查看平台账号、角色与审核状态。">
        <PermissionDeniedState />
      </PageShell>
    );
  }

  if (error && !data) {
    const kind = getPlatformErrorKind(error);
    return (
      <PageShell title="用户列表" description="统一查看平台账号、角色与审核状态。">
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
      description="现在支持教师注册审核，管理员可以在这里完成通过、驳回和账号治理。"
      navItems={adminNavItems}
    >
      {feedback ? (
        <div className="mb-4 rounded-[1.2rem] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm">
          {feedback}
        </div>
      ) : null}

      {error && data ? (
        <div className="mb-4 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 shadow-sm">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">User Center</p>
          <h2 className="mt-2 font-math-display text-3xl font-extrabold text-ink">统一管理平台账号与教师审核</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            这里可以查看学生、教师和管理员账号状态，并直接完成教师注册审核流程。
          </p>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['总用户数', overview.total, 'bg-[#EEF1FF] text-brand-700'],
              ['已启用', overview.activeCount, 'bg-[#EAF7EC] text-[#2E7D32]'],
              ['教师账号', overview.teacherCount, 'bg-[#E7F3FF] text-[#1565C0]'],
              ['待审核教师', overview.pendingTeacherCount, 'bg-[#FFF4E5] text-[#EF6C00]'],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <div className={`inline-flex rounded-[0.9rem] px-3 py-2 text-xs font-black ${tone}`}>
                  {label}
                </div>
                <p className="mt-4 font-math-display text-3xl font-extrabold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {pendingTeachers.length > 0 ? (
        <section className="mt-8 rounded-[2rem] bg-[linear-gradient(180deg,#FFFDF4,#FFFFFF)] p-6 shadow-card ring-1 ring-[#F3E4A6]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="font-math-display text-3xl font-extrabold text-ink">待审核教师</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">注册为教师的账号会先进入这里，审核通过后才允许登录教师工作台。</p>
            </div>
            <div className="rounded-[1rem] bg-white px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-[#F3E4A6]">
              当前待审核 {pendingTeachers.length} 位
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {pendingTeachers.map((teacher) => (
              <article
                key={teacher.id}
                className="rounded-[1.6rem] border border-[#F3E4A6] bg-white/90 p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="font-math-display text-2xl font-extrabold text-ink">{teacher.displayName}</h4>
                      <span className="rounded-full bg-[#FFF4E5] px-3 py-1 text-xs font-black text-[#EF6C00]">
                        待审核
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-2">工号：{teacher.teacherCode ?? '-'}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-2">学校：{teacher.schoolName ?? '未填写'}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-2">学科：{teacher.subject ?? '未填写'}</span>
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
                      className="rounded-[1rem] border border-red-200 bg-red-50 px-5 py-3 text-sm font-extrabold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      驳回申请
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-[2rem] bg-white/85 p-6 shadow-card ring-1 ring-white/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="font-math-display text-3xl font-extrabold text-ink">用户列表</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">支持查看账号信息、审核状态，并对非当前管理员账号执行删除操作。</p>
          </div>
          <div className="rounded-[1rem] bg-[#F7F9FF] px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-brand-100">
            共 {data?.total ?? 0} 个账号
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {data?.list.map((item) => {
            const roleLabel = roleLabelMap[item.role] ?? item.role;
            const roleTone = roleToneMap[item.role] ?? 'bg-slate-100 text-slate-600';
            const isCurrentUser = currentUser?.id === item.id;
            const teacherReviewLabel = item.teacherReviewStatus
              ? teacherReviewLabelMap[item.teacherReviewStatus] ?? item.teacherReviewStatus
              : null;
            const teacherReviewTone = item.teacherReviewStatus
              ? teacherReviewToneMap[item.teacherReviewStatus] ?? 'bg-slate-100 text-slate-600'
              : null;

            return (
              <article
                key={item.id}
                className="rounded-[1.8rem] border border-slate-100 bg-[linear-gradient(180deg,#FFFFFF,#F8FAFF)] p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="font-math-display text-2xl font-extrabold text-ink">{item.displayName}</h4>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${roleTone}`}>{roleLabel}</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          item.isActive ? 'bg-[#EAF7EC] text-[#2E7D32]' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.isActive ? '已启用' : '未激活'}
                      </span>
                      {teacherReviewLabel && teacherReviewTone ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${teacherReviewTone}`}>
                          教师审核：{teacherReviewLabel}
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
                      <span className="rounded-full bg-slate-100 px-3 py-2">学生编号：{item.studentCode ?? '-'}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-2">教师工号：{item.teacherCode ?? '-'}</span>
                      {item.schoolName ? (
                        <span className="rounded-full bg-slate-100 px-3 py-2">学校：{item.schoolName}</span>
                      ) : null}
                      {item.subject ? (
                        <span className="rounded-full bg-slate-100 px-3 py-2">学科：{item.subject}</span>
                      ) : null}
                    </div>

                    {item.teacherReviewNote ? (
                      <p className="text-sm leading-7 text-slate-500">审核备注：{item.teacherReviewNote}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-start gap-3 xl:items-end">
                    <div className="rounded-[1.4rem] bg-[#F8FAFF] px-4 py-4 text-sm text-slate-500 ring-1 ring-slate-100">
                      <p>创建时间</p>
                      <p className="mt-2 font-semibold text-ink">{formatDate(item.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={isCurrentUser || deletingUserId === item.id}
                      onClick={() => void handleDeleteUser(item.id, item.displayName)}
                      className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingUserId === item.id ? '删除中' : '删除账号'}
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
