'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/base/page-shell';
import { adminService, type AdminUsersResult } from '@/services/admin.service';

const adminNavItems = [
  { href: '/admin', label: '管理首页' },
  { href: '/admin/questions', label: '题库管理' },
  { href: '/admin/users', label: '用户列表' },
];

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

  return (
    <PageShell
      title="管理端用户列表"
      description="这里展示管理端基础用户列表，用于确认账号、角色和启用状态。"
      navItems={adminNavItems}
    >
      {error ? (
        <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card">
        <div className="space-y-4">
          {data?.list.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-slate-100 bg-slate-50/80 p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ink">{item.displayName}</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    用户名：{item.username} · 角色：{item.role}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    学生编码：{item.studentCode ?? '-'} · 教师工号：{item.teacherCode ?? '-'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    item.isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.isActive ? '启用中' : '已停用'}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
