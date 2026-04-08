'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
import { getRoleHomePath } from '@/lib/role-route';
import { authService } from '@/services/auth.service';
import { useUserStore } from '@/store/use-user-store';
import type { LoginPayload, UserRole } from '@/types/api';

interface RoleHint {
  role: UserRole;
  title: string;
  shortTitle: string;
  description: string;
  destination: string;
  mood: 'guide' | 'celebrate' | 'focus';
  toneClass: string;
  badgeClass: string;
}

const roleGuides: RoleHint[] = [
  {
    role: 'STUDENT',
    title: '学生学习中心',
    shortTitle: '学生',
    description: '练习、AI答疑、错题复习、学习报告都从这里进入。',
    destination: '/student',
    mood: 'celebrate',
    toneClass: 'bg-[linear-gradient(180deg,#EEF1FF,#FFFFFF)] border-[#C7D2FE]',
    badgeClass: 'bg-brand-50 text-brand-700',
  },
  {
    role: 'TEACHER',
    title: '教师专区',
    shortTitle: '教师',
    description: '查看班级概览、学生列表和基础学情表现。',
    destination: '/teacher',
    mood: 'focus',
    toneClass: 'bg-[linear-gradient(180deg,#E8F5E9,#FFFFFF)] border-[#C8E6C9]',
    badgeClass: 'bg-[#E8F5E9] text-[#2E7D32]',
  },
  {
    role: 'ADMIN',
    title: '管理后台',
    shortTitle: '管理员',
    description: '管理题库、系统用户和平台运行数据。',
    destination: '/admin',
    mood: 'guide',
    toneClass: 'bg-[linear-gradient(180deg,#FFF3E0,#FFFFFF)] border-[#FFE0B2]',
    badgeClass: 'bg-[#FFF3E0] text-[#EF6C00]',
  },
];

const demoAccounts = [
  {
    label: '学生 demo',
    account: 'S20260001',
    password: '123456',
    helper: '体验练习、AI讲题、错题本和学习报告。',
  },
  {
    label: '教师 demo',
    account: 'T20260001',
    password: '123456',
    helper: '体验班级概览、学生列表与学情入口。',
  },
  {
    label: '管理员 demo',
    account: 'admin_demo',
    password: '123456',
    helper: '体验题库管理、用户管理与系统统计。',
  },
];

const welcomeNotes = [
  '和爱因导师一起把数学学明白',
  '练习、提问、复习错题，每天进步一点点',
  '登录后会自动进入对应角色系统',
];

function inferRoleFromAccount(account: string): RoleHint {
  const normalized = account.trim().toUpperCase();

  if (normalized.startsWith('T') || normalized.includes('TEACHER')) {
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

  const { register, watch, setValue, handleSubmit } = useForm<LoginPayload>({
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
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(125,223,255,0.62),rgba(125,223,255,0.12))]" />
      <div className="pointer-events-none absolute left-8 top-14 h-24 w-40 rounded-full bg-white/80 blur-sm" />
      <div className="pointer-events-none absolute right-10 top-20 h-24 w-44 rounded-full bg-white/78 blur-sm" />
      <div className="pointer-events-none absolute left-8 top-44 text-6xl font-black text-brand-100">+</div>
      <div className="pointer-events-none absolute right-20 top-52 text-5xl font-black text-[#FFD54F]">π</div>
      <div className="pointer-events-none absolute left-16 bottom-20 text-5xl font-black text-[#B39DDB]">×</div>
      <div className="pointer-events-none absolute right-12 bottom-24 text-5xl font-black text-[#AED581]">√</div>
      <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-tr-[4rem] bg-[#8BC34A]/20 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-tl-[4rem] bg-[#FFB74D]/22 blur-2xl" />

      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 rounded-[1.7rem] bg-white/86 px-4 py-3 shadow-[0_18px_34px_rgba(63,81,181,0.12)]">
            <div className="rounded-[1.3rem] bg-[linear-gradient(180deg,#F8FBFF,#EEF4FF)] p-2">
              <EinsteinMentor size="sm" mood="guide" badge="入口" />
            </div>
            <div>
              <p className="font-math-display text-2xl font-extrabold text-ink">爱因数学星球</p>
              <p className="text-sm text-slate-600">小学数学智能学习平台登录页</p>
            </div>
          </div>
        </div>

        <section className="relative rounded-[2.5rem] border-[3px] border-[#FFD54F] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,251,231,0.96))] p-4 shadow-[0_30px_60px_rgba(63,81,181,0.16)] sm:p-6 lg:p-8">
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-[2rem] bg-[linear-gradient(180deg,#7FDBFF,#CFF7FF)] px-5 pb-2 pt-3 shadow-[0_22px_40px_rgba(63,81,181,0.14)]">
              <EinsteinMentor size="md" mood="celebrate" badge="爱因导师" />
            </div>
          </div>

          <div className="grid gap-6 pt-20 lg:grid-cols-[1.04fr_0.96fr]">
            <section className="rounded-[2rem] border border-[#C7D2FE] bg-[linear-gradient(180deg,rgba(238,241,255,0.78),rgba(255,255,255,0.94))] p-6 shadow-[0_18px_32px_rgba(63,81,181,0.08)]">
              <div className="flex items-start gap-4">
                <div className="rounded-[1.4rem] bg-white/90 p-3 shadow-[0_14px_24px_rgba(63,81,181,0.08)]">
                  <EinsteinMentor size="sm" mood="guide" badge="欢迎" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
                    Welcome Back
                  </p>
                  <h1 className="font-math-display text-3xl font-extrabold text-ink sm:text-4xl">
                    和爱因斯坦老师一起把数学学明白
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                    登录后将根据你的账号身份自动进入学生、教师或管理员系统。这里不是普通后台登录页，而是整套小学数学平台的角色分流入口。
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {welcomeNotes.map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.3rem] bg-white/88 px-4 py-4 text-sm font-bold leading-6 text-slate-700 shadow-[0_12px_22px_rgba(63,81,181,0.08)]"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-700">
                  角色快捷说明
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {roleGuides.map((guide) => {
                    const active = guide.role === currentRoleHint.role;

                    return (
                      <button
                        key={guide.role}
                        type="button"
                        onClick={() => {
                          const demo = demoAccounts.find((item) =>
                            guide.role === 'STUDENT'
                              ? item.label.includes('学生')
                              : guide.role === 'TEACHER'
                                ? item.label.includes('教师')
                                : item.label.includes('管理员'),
                          );

                          if (demo) {
                            setValue('account', demo.account);
                            setValue('password', demo.password);
                          }
                          setSubmitError('');
                        }}
                        className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                          active
                            ? `${guide.toneClass} shadow-[0_18px_30px_rgba(63,81,181,0.12)]`
                            : 'border-brand-100 bg-white/88 hover:-translate-y-1'
                        }`}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <div className="rounded-[1rem] bg-[linear-gradient(180deg,#F8FBFF,#EEF4FF)] p-2">
                            <EinsteinMentor
                              size="sm"
                              mood={guide.mood}
                              badge={guide.shortTitle}
                            />
                          </div>
                        </div>
                        <p className="font-math-display text-2xl font-extrabold text-ink">
                          {guide.shortTitle}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {guide.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#FFE0B2] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,230,0.98))] p-6 shadow-[0_18px_32px_rgba(255,152,0,0.08)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFEB3B] text-lg font-black text-[#5D4037] shadow-[0_10px_18px_rgba(255,235,59,0.35)]">
                  登
                </div>
                <div>
                  <p className="font-math-display text-3xl font-extrabold text-ink">
                    登录进入平台
                  </p>
                  <p className="text-sm leading-6 text-slate-600">
                    输入账号后，系统会自动识别你将进入哪一个角色空间。
                  </p>
                </div>
              </div>

              <form className="mt-6 space-y-5" onSubmit={onSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-slate-700">
                    学号或账号
                  </label>
                  <input
                    {...register('account')}
                    className="math-input"
                    placeholder="请输入学号、教师工号或管理员账号"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-extrabold text-slate-700">
                    密码
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    className="math-input"
                    placeholder="请输入密码"
                  />
                </div>

                <div className={`rounded-[1.5rem] border px-5 py-4 ${currentRoleHint.toneClass}`}>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${currentRoleHint.badgeClass}`}
                    >
                      自动识别
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Role Routing
                    </span>
                  </div>
                  <p className="mt-3 font-math-display text-2xl font-extrabold text-ink">
                    当前将进入：{currentRoleHint.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {currentRoleHint.description}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    登录成功后跳转：{currentRoleHint.destination}
                  </p>
                </div>

                {submitError ? (
                  <div className="rounded-[1.15rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="math-button-primary w-full rounded-[1.15rem] px-5 py-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? '正在进入数学星球...' : `登录进入${currentRoleHint.shortTitle}系统`}
                </button>
              </form>

              <div className="mt-6 rounded-[1.6rem] bg-[#EEF4FF] px-4 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-math-display text-2xl font-extrabold text-ink">
                      演示账号体验区
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      点击即可自动填充，快速体验不同角色。
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-brand-700">
                    Demo
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {demoAccounts.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setValue('account', item.account);
                        setValue('password', item.password);
                        setSubmitError('');
                      }}
                      className="math-button-secondary w-full rounded-[1.25rem] px-4 py-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-math-display text-xl font-extrabold text-ink">
                            {item.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {item.account} / {item.password}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {item.helper}
                          </p>
                        </div>
                        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
                          填充
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
