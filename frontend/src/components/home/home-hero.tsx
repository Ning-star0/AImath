'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
import { getRoleHomePath } from '@/lib/role-route';
import { authService } from '@/services/auth.service';
import { useUserStore } from '@/store/use-user-store';
import type { LoginPayload, UserRole } from '@/types/api';

const navItems = [
  { href: '/', title: '首页', active: true },
  { href: '/student/practice', title: '智能练习 / 数学地图' },
  { href: '/student/ai-qa', title: 'AI答疑' },
  { href: '/student/wrongbook', title: '错题本' },
  { href: '/student/reports', title: '学习报告' },
  { href: '/teacher', title: '教师端' },
  { href: '/admin', title: '管理端' },
];

const roleCards: Array<{
  role: UserRole;
  title: string;
  description: string;
  path: string;
  badge: string;
  mood: 'guide' | 'celebrate' | 'focus';
  tone: string;
  buttonText: string;
}> = [
  {
    role: 'STUDENT',
    title: '学生入口',
    description: '做练习、问 AI、复习错题、看成长报告，进入完整学习主链路。',
    path: '/student',
    badge: '主入口',
    mood: 'celebrate',
    tone: 'bg-[linear-gradient(180deg,#EEF1FF,#FFFFFF)] border-[#C5D0FF]',
    buttonText: '进入学生学习中心',
  },
  {
    role: 'TEACHER',
    title: '教师入口',
    description: '查看班级概览、学生列表和基础学情数据，支撑教学跟进。',
    path: '/teacher',
    badge: '教学视角',
    mood: 'focus',
    tone: 'bg-[linear-gradient(180deg,#E8F5E9,#FFFFFF)] border-[#BFE3C2]',
    buttonText: '进入教师专区',
  },
  {
    role: 'ADMIN',
    title: '管理员入口',
    description: '管理题库、用户账号和系统统计，维护平台日常运行。',
    path: '/admin',
    badge: '平台维护',
    mood: 'guide',
    tone: 'bg-[linear-gradient(180deg,#FFF3E0,#FFFFFF)] border-[#FFD39B]',
    buttonText: '进入管理后台',
  },
];

const demoAccounts = [
  { label: '学生 demo', account: 'S20260001', password: '123456', role: '学生' },
  { label: '教师 demo', account: 'T20260001', password: '123456', role: '教师' },
  { label: '管理员 demo', account: 'admin_demo', password: '123456', role: '管理员' },
];

const quickTags = [
  '今日任务 3 项',
  '成长星星已开启',
  '错题复习自动沉淀',
  'AI 讲题随时可问',
];

const rolePathLabel: Record<UserRole, string> = {
  STUDENT: '学生学习中心',
  TEACHER: '教师工作区',
  ADMIN: '系统管理中心',
};

function inferRole(account: string): UserRole {
  const normalized = account.trim().toUpperCase();

  if (normalized.startsWith('T') || normalized.includes('TEACHER')) {
    return 'TEACHER';
  }

  if (normalized.includes('ADMIN') || normalized.startsWith('A')) {
    return 'ADMIN';
  }

  return 'STUDENT';
}

function getRoleCopy(role: UserRole) {
  if (role === 'TEACHER') {
    return {
      title: '当前将进入：教师专区',
      desc: '用于查看班级概览、学生列表和基础学情。',
    };
  }

  if (role === 'ADMIN') {
    return {
      title: '当前将进入：管理后台',
      desc: '用于维护题库、查看用户和平台统计。',
    };
  }

  return {
    title: '当前将进入：学生学习中心',
    desc: '用于练习闯关、AI讲题、错题复习和成长报告。',
  };
}

export function HomeHero() {
  const router = useRouter();
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const currentUser = useUserStore((state) => state.currentUser);
  const setSession = useUserStore((state) => state.setSession);
  const [account, setAccount] = useState('S20260001');
  const [password, setPassword] = useState('123456');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const role = useMemo(() => inferRole(account), [account]);
  const roleCopy = useMemo(() => getRoleCopy(role), [role]);

  const handlePrimaryAction = async () => {
    if (currentUser) {
      router.push(getRoleHomePath(currentUser.role));
      return;
    }

    setSubmitError('');
    setSubmitting(true);

    try {
      const payload: LoginPayload = {
        account: account.trim(),
        password,
      };
      const result = await authService.login(payload);
      setSession(result.accessToken, result.user);
      router.push(getRoleHomePath(result.user.role));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '登录失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="portal-shell relative overflow-hidden px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-0 top-0 h-56 w-56 rounded-full bg-white/70 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-10 h-52 w-52 rounded-full bg-white/60 blur-3xl" />
      <div className="pointer-events-none absolute left-10 top-36 text-6xl font-black text-brand-100">+</div>
      <div className="pointer-events-none absolute right-20 top-44 text-5xl font-black text-[#FFD54F]">π</div>
      <div className="pointer-events-none absolute left-20 bottom-28 text-5xl font-black text-[#C5D0FF]">×</div>
      <div className="pointer-events-none absolute right-12 bottom-32 text-5xl font-black text-[#BFE3C2]">√</div>

      <div className="mx-auto max-w-7xl">
        <header className="math-card mb-8 rounded-[2rem] px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-[1.4rem] bg-white/90 p-3 shadow-[0_14px_28px_rgba(63,81,181,0.12)]">
                <EinsteinMentor size="sm" mood="guide" badge="Logo" />
              </div>
              <div>
                <p className="font-math-display text-2xl font-extrabold text-ink">爱因数学星球</p>
                <p className="text-sm text-slate-600">小学数学智能学习平台</p>
              </div>
            </div>

            <nav className="grid gap-2 sm:grid-cols-3 xl:flex xl:flex-wrap xl:justify-end">
              {navItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`math-lift rounded-[1rem] border px-4 py-2 text-center text-sm font-extrabold ${
                    item.active
                      ? 'border-brand-700 bg-brand-700 text-white shadow-[0_14px_28px_rgba(63,81,181,0.22)]'
                      : 'border-brand-100 bg-white/86 text-slate-700'
                  }`}
                >
                  {item.title}
                </Link>
              ))}
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="math-button-secondary rounded-[1rem] px-4 py-2 text-sm font-extrabold text-slate-700"
              >
                登录
              </Link>
              <button
                type="button"
                onClick={() => {
                  setAccount('S20260001');
                  setPassword('123456');
                }}
                className="math-button-primary rounded-[1rem] px-4 py-2 text-sm font-extrabold text-white"
              >
                演示体验
              </button>
              <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-brand-700 shadow-[0_12px_20px_rgba(63,81,181,0.12)]">
                {currentUser
                  ? `当前身份：${rolePathLabel[currentUser.role as UserRole] ?? currentUser.role}`
                  : `快速入口：${rolePathLabel[role]}`}
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
          <section className="math-card math-panel relative rounded-[2.4rem] border-[2px] border-[#C5D0FF] bg-[linear-gradient(180deg,rgba(227,242,253,0.82),rgba(255,253,245,0.98))] px-6 py-8 sm:px-8">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(255,235,59,0.12))]" />
            <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="math-chip math-chip-primary">小学 1-6 年级</span>
                  <span className="math-chip math-chip-success">练习 + AI讲题 + 错题 + 报告</span>
                  <span className="math-chip math-chip-warm">完整平台而非 demo</span>
                </div>

                <h1 className="font-math-display text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
                  小学数学智能学习平台
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                  练习、AI讲题、错题复习、学习报告，一站式把数学学明白。学生能学，教师能看，管理员能维护，这是一套完整平台，不是单页演示。
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/student"
                    className="math-button-primary rounded-[1.1rem] px-6 py-4 text-base font-extrabold text-white"
                  >
                    立即开始学习
                  </Link>
                  <Link
                    href="/student/ai-qa"
                    className="math-button-secondary rounded-[1.1rem] px-6 py-4 text-base font-extrabold text-slate-700"
                  >
                    体验 AI 讲题
                  </Link>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="math-stat-card px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">学生端</p>
                    <p className="mt-2 font-math-display text-2xl font-extrabold text-ink">练习主链路</p>
                    <p className="mt-1 text-sm text-slate-600">练习、讲题、错题、报告持续衔接</p>
                  </div>
                  <div className="math-stat-card px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2E7D32]">教师端</p>
                    <p className="mt-2 font-math-display text-2xl font-extrabold text-ink">学情查看</p>
                    <p className="mt-1 text-sm text-slate-600">班级总览、学生列表、报告预览</p>
                  </div>
                  <div className="math-stat-card px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EF6C00]">管理端</p>
                    <p className="mt-2 font-math-display text-2xl font-extrabold text-ink">平台维护</p>
                    <p className="mt-1 text-sm text-slate-600">用户、题库、系统统计与 AI 配置</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {quickTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/88 px-4 py-2 text-sm font-bold text-slate-700 shadow-[0_12px_22px_rgba(63,81,181,0.08)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-sm rounded-[2rem] bg-[linear-gradient(180deg,#7FDBFF,#E8F5E9)] px-6 pb-6 pt-7 text-center shadow-[0_24px_46px_rgba(63,81,181,0.16)]">
                  <EinsteinMentor size="lg" mood="celebrate" badge="爱因导师" className="mx-auto" />
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.2rem] bg-white/88 px-3 py-3">
                      <p className="text-xs font-bold text-slate-500">今日任务</p>
                      <p className="mt-1 font-math-display text-2xl font-extrabold text-brand-700">3</p>
                    </div>
                    <div className="rounded-[1.2rem] bg-white/88 px-3 py-3">
                      <p className="text-xs font-bold text-slate-500">成长星星</p>
                      <p className="mt-1 font-math-display text-2xl font-extrabold text-[#EF6C00]">18</p>
                    </div>
                    <div className="rounded-[1.2rem] bg-white/88 px-3 py-3">
                      <p className="text-xs font-bold text-slate-500">数学地图</p>
                      <p className="mt-1 font-math-display text-2xl font-extrabold text-[#2E7D32]">4站</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    爱因导师会在练习、讲题、错题复盘和成长反馈里一直陪着学生。
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="math-card math-panel rounded-[2.4rem] border-[2px] border-[#FFD39B] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,248,230,0.98))] px-6 py-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFEB3B] text-lg font-black text-[#5D4037] shadow-[0_10px_18px_rgba(255,235,59,0.35)]">
                登
              </div>
              <div>
                <p className="font-math-display text-3xl font-extrabold text-ink">快速开始体验</p>
                <p className="text-sm leading-6 text-slate-600">
                  首页就能完成角色识别、快速登录和 demo 体验，不只是宣传入口。
                </p>
              </div>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handlePrimaryAction();
              }}
            >
              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-slate-700">学号或账号</span>
                <input
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  placeholder="请输入学号、教师工号或管理员账号"
                  className="math-input"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-slate-700">密码</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  className="math-input"
                />
              </label>

              <div className="rounded-[1.4rem] border border-[#FFE082] bg-[linear-gradient(180deg,#FFFDE7,#FFF8C6)] px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9E7A00]">当前身份提示</p>
                <p className="mt-2 font-math-display text-2xl font-extrabold text-ink">{roleCopy.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{roleCopy.desc}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">登录后跳转：{getRoleHomePath(role)}</p>
              </div>

              {submitError ? (
                <div className="rounded-[1.1rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {submitError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="math-button-primary w-full rounded-[1.1rem] px-5 py-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? '正在进入平台...' : currentUser ? '进入当前身份首页' : '登录进入平台'}
              </button>
            </form>

            <div className="mt-6">
              <p className="text-sm font-extrabold text-slate-700">演示账号体验入口</p>
              <div className="mt-3 grid gap-3">
                {demoAccounts.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setAccount(item.account);
                      setPassword(item.password);
                      setSubmitError('');
                    }}
                    className="math-button-secondary rounded-[1.2rem] px-4 py-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-math-display text-xl font-extrabold text-ink">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{item.account} / {item.password}</p>
                      </div>
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
                        {item.role}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-8" id="roles">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">角色分流</p>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">学生、教师、管理员三种入口清晰可见</h2>
            </div>
            <span className="math-chip math-chip-primary">学生入口优先突出</span>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {roleCards.map((item) => (
              <Link
                key={item.role}
                href={item.path}
                className={`math-lift rounded-[1.8rem] border px-5 py-5 shadow-[0_18px_34px_rgba(63,81,181,0.1)] ${item.tone}`}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-[1.25rem] bg-white/90 p-3 shadow-[0_10px_22px_rgba(63,81,181,0.08)]">
                    <EinsteinMentor size="sm" mood={item.mood} badge={item.badge} />
                  </div>
                  <div className="flex-1">
                    <p className="font-math-display text-2xl font-extrabold text-ink">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                    <div className="mt-4 inline-flex rounded-full bg-white/92 px-4 py-2 text-sm font-extrabold text-brand-700">
                      {item.buttonText}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
