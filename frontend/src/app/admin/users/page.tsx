'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/base/page-shell';
import { adminService, type AdminUsersResult } from '@/services/admin.service';

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
  const [data, setData] = useState<AdminUsersResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await adminService.getUsers();
        setData(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '用户列表加载失败');
      }
    };

    void load();
  }, []);

  const overview = useMemo(() => {
    if (!data?.list.length) {
      return {
        total: 0,
        activeCount: 0,
        studentCount: 0,
        teacherCount: 0,
      };
    }

    return {
      total: data.total,
      activeCount: data.list.filter((item) => item.isActive).length,
      studentCount: data.list.filter((item) => item.role === 'STUDENT').length,
      teacherCount: data.list.filter((item) => item.role === 'TEACHER').length,
    };
  }, [data]);

  return (
    <PageShell
      title="管理端用户列表"
      description="清晰查看用户账号、角色与启用状态，让管理端更像真实平台维护中心，而不是模板式后台。"
      navItems={adminNavItems}
    >
      {error ? (
        <div className="mb-6 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">USER CENTER</p>
          <h2 className="mt-2 font-math-display text-3xl font-extrabold text-ink">
            更清晰的角色与账号状态展示
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            这里重点体现用户是否启用、属于哪种角色，以及学生码 / 教师工号等基础信息，方便管理员快速判断系统结构是否健康。
          </p>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['总用户数', overview.total, 'bg-[#EEF1FF] text-brand-700'],
              ['已启用', overview.activeCount, 'bg-[#EAF7EC] text-[#2E7D32]'],
              ['学生账号', overview.studentCount, 'bg-[#E7F3FF] text-[#1565C0]'],
              ['教师账号', overview.teacherCount, 'bg-[#FFF4E5] text-[#EF6C00]'],
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

      <section className="mt-8 rounded-[2rem] bg-white/85 p-6 shadow-card ring-1 ring-white/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="font-math-display text-3xl font-extrabold text-ink">用户列表</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              管理端可以更偏效率工具，但仍然使用同一套圆角、卡片和品牌色体系，避免像完全无关的后台模板。
            </p>
          </div>
          <div className="rounded-[1rem] bg-[#F7F9FF] px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-brand-100">
            共 {data?.total ?? 0} 个账号
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {data?.list.map((item) => {
            const roleLabel = roleLabelMap[item.role] ?? item.role;
            const roleTone = roleToneMap[item.role] ?? 'bg-slate-100 text-slate-600';

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
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${roleTone}`}>
                        {roleLabel}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          item.isActive
                            ? 'bg-[#EAF7EC] text-[#2E7D32]'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.isActive ? '已启用' : '已停用'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-2">
                        用户名：{item.username}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-2">
                        学生码：{item.studentCode ?? '-'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-2">
                        教师工号：{item.teacherCode ?? '-'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] bg-[#F8FAFF] px-4 py-4 text-sm text-slate-500 ring-1 ring-slate-100">
                    <p>创建时间</p>
                    <p className="mt-2 font-semibold text-ink">{formatDate(item.createdAt)}</p>
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
