'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PageShell } from '@/components/base/page-shell';
import { getRoleHomePath } from '@/lib/role-route';
import { authService } from '@/services/auth.service';
import { useUserStore } from '@/store/use-user-store';
import type { LoginPayload, UserRole } from '@/types/api';

interface RoleHint {
  role: UserRole;
  title: string;
  description: string;
  destination: string;
}

const roleGuides: RoleHint[] = [
  {
    role: 'STUDENT',
    title: '学生学习中心',
    description: '进入练习、AI 答疑、错题本和学习报告。',
    destination: '/student',
  },
  {
    role: 'TEACHER',
    title: '教师后台',
    description: '进入班级概览和学生学习情况查看页。',
    destination: '/teacher',
  },
  {
    role: 'ADMIN',
    title: '管理员后台',
    description: '进入题库管理、用户列表和系统配置区域。',
    destination: '/admin',
  },
];

function inferRoleFromAccount(account: string): RoleHint {
  const normalized = account.trim().toUpperCase();

  if (normalized.startsWith('T')) {
    return roleGuides[1];
  }

  if (
    normalized.includes('ADMIN') ||
    normalized.startsWith('A') ||
    normalized === 'ROOT'
  ) {
    return roleGuides[2];
  }

  return roleGuides[0];
}

export default function LoginPage() {
  const router = useRouter();
  const setSession = useUserStore((state) => state.setSession);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (!currentUser?.role) {
      return;
    }

    router.replace(getRoleHomePath(currentUser.role));
  }, [currentUser?.role, router]);

  const { register, watch, handleSubmit } = useForm<LoginPayload>({
    defaultValues: {
      account: 'S20260001',
      password: '123456',
    },
  });

  const accountValue = watch('account');
  const currentRoleHint = useMemo(
    () => inferRoleFromAccount(accountValue ?? ''),
    [accountValue],
  );

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('');
    setSubmitting(true);

    try {
      const result = await authService.login(values);
      setSession(result.accessToken, result.user);
      router.push(getRoleHomePath(result.user.role));
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : '登录失败，请稍后重试。',
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <PageShell
      title="登录"
      description="输入账号后，系统会自动识别角色，并进入对应的学生学习中心、教师后台或管理员后台。"
    >
      <section className="mx-auto max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/92 p-8 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-lg font-semibold text-brand-700">
                登
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink">选择你的身份并进入系统</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  登录成功后会自动进入对应角色页面，不需要再手动切换。
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-5" onSubmit={onSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  学号或账号
                </label>
                <input
                  {...register('account')}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-brand-500"
                  placeholder="请输入学号、教师工号或管理员账号"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  密码
                </label>
                <input
                  {...register('password')}
                  type="password"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-brand-500"
                  placeholder="请输入密码"
                />
              </div>

              <div className="rounded-2xl border border-brand-100 bg-brand-50/80 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                  自动识别结果
                </p>
                <p className="mt-2 text-lg font-semibold text-ink">
                  当前将进入：{currentRoleHint.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {currentRoleHint.description}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  登录后跳转到：{currentRoleHint.destination}
                </p>
              </div>

              {submitError ? (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {submitError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {submitting ? '登录中...' : `登录进入${currentRoleHint.title}`}
              </button>
            </form>
          </div>

          <div className="space-y-5">
            <section className="rounded-[2rem] border border-white/70 bg-white/92 p-8 shadow-card">
              <h2 className="text-xl font-bold text-ink">不同角色进入不同系统</h2>
              <div className="mt-5 space-y-4">
                {roleGuides.map((guide) => (
                  <article
                    key={guide.role}
                    className={`rounded-3xl border px-5 py-4 transition ${
                      currentRoleHint.role === guide.role
                        ? 'border-brand-200 bg-brand-50/80'
                        : 'border-slate-100 bg-slate-50/70'
                    }`}
                  >
                    <p className="text-base font-semibold text-ink">{guide.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {guide.description}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      登录后入口：{guide.destination}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/70 bg-white/92 p-8 shadow-card">
              <h2 className="text-xl font-bold text-ink">演示账号</h2>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
                <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                  学生：`S20260001 / 123456`
                </div>
                <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                  教师：`T20260001 / 123456`
                </div>
                <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                  管理员：`admin_demo / 123456`
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
