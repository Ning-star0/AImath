'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/base/page-shell';
import {
  AuthRequiredState,
  NetworkErrorState,
  PageLoadErrorState,
  PermissionDeniedState,
  SessionExpiredState,
} from '@/components/states/platform-states';
import { getPlatformErrorKind } from '@/lib/platform-errors';
import { governanceService, type PilotFeedbackListResult, type SystemLogListResult } from '@/services/governance.service';
import { useUserStore } from '@/store/use-user-store';

const adminNavItems = [
  { href: '/admin', label: '管理首页' },
  { href: '/admin/classes', label: '班级管理' },
  { href: '/admin/governance', label: '治理日志' },
  { href: '/admin/questions', label: '题库管理' },
  { href: '/admin/users', label: '用户列表' },
];

export default function AdminGovernancePage() {
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const [feedbackList, setFeedbackList] = useState<PilotFeedbackListResult | null>(null);
  const [logs, setLogs] = useState<SystemLogListResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const load = async () => {
      try {
        const [feedbackData, logData] = await Promise.all([
          governanceService.getPilotFeedbackList(),
          governanceService.getSystemLogs(),
        ]);
        setFeedbackList(feedbackData);
        setLogs(logData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '治理日志加载失败。');
      }
    };

    if (!accessToken || currentUser?.role !== 'ADMIN') {
      return;
    }

    void load();
  }, [accessToken, currentUser?.role]);

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="治理日志" description="查看试点反馈与系统日志。" navItems={adminNavItems}>
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'ADMIN') {
    return (
      <PageShell title="治理日志" description="查看试点反馈与系统日志。" navItems={adminNavItems}>
        <PermissionDeniedState />
      </PageShell>
    );
  }

  if (error && !feedbackList && !logs) {
    const kind = getPlatformErrorKind(error);
    return (
      <PageShell title="治理日志" description="查看试点反馈与系统日志。" navItems={adminNavItems}>
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
      title="治理日志"
      description="这里汇总试点反馈和关键系统日志，便于答辩材料整理、试点复盘和运维追踪。"
      navItems={adminNavItems}
    >
      <section className="grid gap-6 xl:grid-cols-2">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <h2 className="font-math-display text-3xl font-extrabold text-ink">试点反馈</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            当前共 {feedbackList?.total ?? 0} 条。适合后续整理试点汇报、用户访谈补充和答辩证据。
          </p>
          <div className="mt-5 space-y-3">
            {feedbackList?.list.map((item) => (
              <div key={item.id} className="rounded-[1.4rem] bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#EEF1FF] px-3 py-1 text-xs font-black text-brand-700">
                    {item.feedbackType}
                  </span>
                  {item.rating ? (
                    <span className="rounded-full bg-[#FFF4E5] px-3 py-1 text-xs font-black text-[#EF6C00]">
                      评分 {item.rating}/5
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{item.content}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {item.contactName ?? item.user?.displayName ?? '匿名'} · {item.schoolName ?? '未填写学校'} · {item.createdAt.slice(0, 10)}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <h2 className="font-math-display text-3xl font-extrabold text-ink">系统日志</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            当前展示最近 {logs?.total ?? 0} 条，用于追踪教师审核、班级权限、OCR 识题和试点反馈等关键动作。
          </p>
          <div className="mt-5 space-y-3">
            {logs?.list.map((item) => (
              <div key={item.id} className="rounded-[1.4rem] bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#EAF7EC] px-3 py-1 text-xs font-black text-[#2E7D32]">
                    {item.module}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {item.action}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{item.message}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {item.actor?.displayName ?? '系统'} · {item.createdAt.slice(0, 19).replace('T', ' ')}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PageShell>
  );
}
