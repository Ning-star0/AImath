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
  { href: '/student/ai-qa', title: 'AI 答疑' },
  { href: '/student/practice', title: '智能练习' },
  { href: '/teacher', title: '教师端' },
  { href: '/admin', title: '管理端' },
];

const roleCards: Array<{
  role: UserRole;
  title: string;
  description: string;
  path: string;
  tone: string;
}> = [
  {
    role: 'STUDENT',
    title: '学生',
    description: '练习、AI 讲题、错题本、学习报告',
    path: '/student',
    tone: 'bg-[linear-gradient(180deg,#FFFDE7,#FFFFFF)] border-[#F2D66B]',
  },
  {
    role: 'TEACHER',
    title: '教师',
    description: '班级概览、学生列表、学情查看',
    path: '/teacher',
    tone: 'bg-[linear-gradient(180deg,#FFF8E8,#FFFFFF)] border-[#F0C786]',
  },
  {
    role: 'ADMIN',
    title: '管理员',
    description: '题库、用户、系统维护',
    path: '/admin',
    tone: 'bg-[linear-gradient(180deg,#FFF7FB,#FFFFFF)] border-[#E7C5D8]',
  },
];

const demoAccounts = [
  { account: 'S20260001', password: '123456', role: 'STUDENT' as const },
  { account: 'T20260001', password: '123456', role: 'TEACHER' as const },
  { account: 'admin_demo', password: '123456', role: 'ADMIN' as const },
];

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
    return '当前将进入：教师工作区';
  }

  if (role === 'ADMIN') {
    return '当前将进入：系统管理中心';
  }

  return '当前将进入：学生学习中心';
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

  const handleQuickLogin = async () => {
    if (currentUser) {
      router.push(getRoleHomePath(currentUser.role));
      return;
    }

    setSubmitError('');
    setSubmitting(true);

    try {
      const payload: LoginPayload = { account: account.trim(), password };
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
    <section className="storybook-scene relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-8 top-14 h-24 w-44 rounded-full bg-white/86 blur-sm" />
      <div className="pointer-events-none absolute right-10 top-20 h-24 w-44 rounded-full bg-white/84 blur-sm" />
      <div className="pointer-events-none absolute left-14 bottom-16 h-28 w-28 rounded-full bg-[#8BC34A]/28 blur-2xl" />
      <div className="pointer-events-none absolute right-16 bottom-16 h-28 w-28 rounded-full bg-[#FFB74D]/30 blur-2xl" />

      <div className="mx-auto max-w-7xl">
        <header className="portal-board mb-6 px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-[1.4rem] bg-white/92 p-3 shadow-[0_14px_28px_rgba(63,81,181,0.12)]">
                <EinsteinMentor size="sm" mood="guide" badge="AI" />
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
                      ? 'border-[#1A8E38] bg-[#1A8E38] text-white shadow-[0_14px_28px_rgba(26,142,56,0.22)]'
                      : 'border-[#F7D672] bg-white/90 text-slate-700'
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
                onClick={() => void handleQuickLogin()}
                className="math-button-primary rounded-[1rem] px-4 py-2 text-sm font-extrabold text-white"
              >
                {submitting ? '进入中...' : '快速进入'}
              </button>
            </div>
          </div>
        </header>

        <section className="portal-board relative px-5 pb-6 pt-20 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-[2rem] bg-[linear-gradient(180deg,#6FDFFF,#D3F8FF)] px-6 pb-2 pt-3 shadow-[0_22px_40px_rgba(63,81,181,0.16)]">
              <EinsteinMentor size="lg" mood="celebrate" badge="爱因导师" />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <section className="rounded-[2rem] border-2 border-[#F0C95C] bg-[linear-gradient(180deg,rgba(255,255,245,0.96),rgba(255,255,255,0.92))] p-6 shadow-[0_18px_36px_rgba(255,193,7,0.12)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFCF3A] text-lg font-black text-[#5D4037]">
                  AI
                </div>
                <div>
                  <p className="font-math-display text-3xl font-extrabold text-ink">和爱因导师聊数学</p>
                  <p className="text-sm leading-6 text-slate-600">
                    首页不再往下堆很多信息，直接把 AI 对话体验放到最中心。
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-[1.5rem] bg-[#E8F9FF] px-4 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">
                    爱因导师
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    你好呀，今天想练口算、应用题，还是把错题重新讲清楚？
                  </p>
                </div>

                <div className="rounded-[1.5rem] bg-[#FFF9D9] px-4 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8F6C00]">
                    你可以这样问
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      '帮我讲这道三年级加法题',
                      '我不会应用题，先教我审题',
                      '给我出一道类似题',
                    ].map((item) => (
                      <Link
                        key={item}
                        href="/student/ai-qa"
                        className="math-button-secondary rounded-full px-4 py-2 text-sm font-bold text-slate-700"
                      >
                        {item}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border-2 border-[#D9E3FF] bg-white px-4 py-4">
                  <label className="mb-2 block text-sm font-extrabold text-slate-700">
                    账号体验入口
                  </label>
                  <input
                    value={account}
                    onChange={(event) => setAccount(event.target.value)}
                    className="math-input"
                    placeholder="请输入学号、教师工号或管理员账号"
                  />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    className="math-input mt-3"
                    placeholder="请输入密码"
                  />
                  <div className="mt-3 rounded-[1.25rem] bg-[#FFFCE8] px-4 py-3">
                    <p className="text-sm font-bold text-[#8F6C00]">{roleCopy}</p>
                  </div>
                  {submitError ? (
                    <div className="mt-3 rounded-[1.1rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                      {submitError}
                    </div>
                  ) : null}
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => void handleQuickLogin()}
                      className="math-button-primary flex-1 rounded-[1rem] px-4 py-3 text-sm font-extrabold text-white"
                    >
                      {submitting ? '进入中...' : '登录进入平台'}
                    </button>
                    <Link
                      href="/student/ai-qa"
                      className="math-button-secondary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700"
                    >
                      先看 AI
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border-2 border-[#F0C95C] bg-[linear-gradient(180deg,rgba(255,252,242,0.96),rgba(255,255,255,0.92))] p-6 shadow-[0_18px_36px_rgba(255,193,7,0.12)]">
              <div className="grid gap-4">
                <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,#FFFCE8,#FFFFFF)] px-5 py-5">
                  <p className="font-math-display text-4xl font-extrabold text-ink">
                    小学数学 AI 学习入口
                  </p>
                  <p className="mt-3 text-base leading-8 text-slate-600">
                    练习、AI 讲题、错题复习、学习报告，都围绕爱因导师这一套交互展开。
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {['AI 讲题', '数学地图', '错题本', '学习报告', '教师端', '管理端'].map(
                      (item) => (
                        <span
                          key={item}
                          className="cloud-badge px-4 py-2 text-sm font-bold text-slate-700"
                        >
                          {item}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {roleCards.map((item, index) => (
                    <Link
                      key={item.role}
                      href={item.path}
                      className={`rounded-[1.6rem] border-2 px-4 py-4 shadow-[0_12px_24px_rgba(255,193,7,0.1)] transition hover:-translate-y-1 ${item.tone}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-math-display text-2xl font-extrabold text-ink">
                          {item.title}
                        </p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-brand-700">
                          入口
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          const demo = demoAccounts[index];
                          setAccount(demo.account);
                          setPassword(demo.password);
                        }}
                        className="mt-4 math-button-secondary rounded-full px-4 py-2 text-xs font-extrabold text-slate-700"
                      >
                        填充 demo
                      </button>
                    </Link>
                  ))}
                </div>

                <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,#E8F9FF,#FFFFFF)] px-5 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-math-display text-2xl font-extrabold text-ink">
                        首页只保留最核心的信息
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        不再长页面下滑。首屏直接告诉用户这是 AI 数学平台，并给出聊天、登录和角色分流三个核心动作。
                      </p>
                    </div>
                    <Link
                      href="/student"
                      className="math-button-primary rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white"
                    >
                      进入学生中心
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </section>
  );
}
