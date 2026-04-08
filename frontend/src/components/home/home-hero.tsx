'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleHomePath } from '@/lib/role-route';
import { authService } from '@/services/auth.service';
import { useUserStore } from '@/store/use-user-store';
import type { LoginPayload, UserRole } from '@/types/api';

const navItems = [
  { href: '/', title: '首页' },
  {
    href: '/student/practice',
    title: '练习',
  },
  {
    href: '/student/ai-qa',
    title: 'AI答疑',
  },
  {
    href: '/student/wrongbook',
    title: '错题本',
  },
  {
    href: '/student/reports',
    title: '学习报告',
  },
];

const roleCards: Array<{
  role: UserRole;
  title: string;
  description: string;
  path: string;
  toneClass: string;
  iconToneClass: string;
}> = [
  {
    role: 'STUDENT',
    title: '进入手心学习中心',
    description: '进练习、AI 答疑、错题本和学习报告。',
    path: '/student',
    toneClass:
      'from-[#e8f8ff] to-[#f7fdff] border-[#9edcff] hover:border-[#73c6ff] hover:shadow-[0_18px_34px_rgba(95,174,233,0.24)]',
    iconToneClass: 'from-[#ffd86b] to-[#ffbf3f]',
  },
  {
    role: 'TEACHER',
    title: '教师',
    description: '进入班级学习概览，查看学生练习与成长情况。',
    path: '/teacher',
    toneClass:
      'from-[#fff2f7] to-[#fffafc] border-[#f1bfd3] hover:border-[#e89ab9] hover:shadow-[0_18px_34px_rgba(232,154,185,0.2)]',
    iconToneClass: 'from-[#ffb07a] to-[#ff8d61]',
  },
  {
    role: 'ADMIN',
    title: '管理员',
    description: '管理题库、系统后台与数据看板区域。',
    path: '/admin',
    toneClass:
      'from-[#f6f1ff] to-[#fdfbff] border-[#cfbefa] hover:border-[#b69bff] hover:shadow-[0_18px_34px_rgba(150,118,255,0.2)]',
    iconToneClass: 'from-[#ffe287] to-[#ffc94c]',
  },
];

const demoAccounts: Array<{
  label: string;
  account: string;
  password: string;
}> = [
  {
    label: '学生体验',
    account: 'S20260001',
    password: '123456',
  },
  {
    label: '教师体验',
    account: 'T20260001',
    password: '123456',
  },
  {
    label: '管理员体验',
    account: 'admin_demo',
    password: '123456',
  },
];

function inferRole(account: string, currentRole?: UserRole | null): UserRole {
  const normalized = account.trim().toLowerCase();

  if (normalized.startsWith('t') || normalized.includes('teacher')) {
    return 'TEACHER';
  }

  if (normalized.startsWith('a') || normalized.includes('admin')) {
    return 'ADMIN';
  }

  if (normalized.startsWith('s') || normalized.includes('student')) {
    return 'STUDENT';
  }

  return currentRole ?? 'STUDENT';
}

function getRoleCopy(role: UserRole) {
  if (role === 'TEACHER') {
    return {
      headline: '教师教学工作台',
      description: '进入班级概览、学生表现和近期练习统计。',
      buttonLabel: '登录进入教师后台',
    };
  }

  if (role === 'ADMIN') {
    return {
      headline: '管理员系统后台',
      description: '进入题库管理、用户治理和系统数据概览。',
      buttonLabel: '登录进入管理员后台',
    };
  }

  return {
    headline: '学生学习中心',
    description: '进入练习、AI 答疑、错题本和学习报告。',
    buttonLabel: '登录进入学生学习中心',
  };
}

function EinsteinMark({
  variant = 'default',
}: {
  variant?: 'default' | 'student' | 'teacher' | 'admin';
}) {
  const accent =
    variant === 'teacher'
      ? '#ff8d61'
      : variant === 'admin'
        ? '#8b6dff'
        : '#f5b942';

  return (
    <div className="relative flex h-20 w-20 items-end justify-center">
      <div className="absolute top-1 h-11 w-14 rounded-full border-2 border-[#6e4a35] bg-[#fff6ef]" />
      <div className="absolute top-0 h-10 w-16 rounded-full bg-white shadow-[0_8px_12px_rgba(255,255,255,0.75)]" />
      <div className="absolute left-1 top-2 h-6 w-5 rounded-full bg-white" />
      <div className="absolute right-1 top-2 h-6 w-5 rounded-full bg-white" />
      <div className="absolute top-5 h-2 w-2 rounded-full bg-[#3a312f]" />
      <div className="absolute top-5 left-[29px] h-2 w-2 rounded-full bg-[#3a312f]" />
      <div className="absolute top-9 h-2 w-6 rounded-full bg-[#bf7548]" />
      <div className="absolute top-[3.3rem] h-2 w-4 rounded-full bg-[#6e4a35]" />
      <div
        className="absolute bottom-1 h-8 w-14 rounded-t-[1.1rem] rounded-b-lg border-2 border-[#5c615b]"
        style={{ background: `linear-gradient(180deg, ${accent}, #5cb8b5)` }}
      />
      <div className="absolute bottom-3 h-2 w-2 rounded-full bg-[#3a312f]" />
      {variant === 'student' ? (
        <div className="absolute -right-1 bottom-3 rounded-md bg-[#fff1b8] px-1.5 py-0.5 text-[10px] font-bold text-[#7d5b00] shadow-sm">
          书
        </div>
      ) : null}
      {variant === 'teacher' ? (
        <div className="absolute -right-1 bottom-3 h-6 w-1.5 rounded-full bg-[#6a4b2f]" />
      ) : null}
      {variant === 'admin' ? (
        <div className="absolute -right-1 bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#fff1a8] text-[11px] text-[#7b5b00] shadow-sm">
          ⚙
        </div>
      ) : null}
    </div>
  );
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

  const inferredRole = useMemo(
    () => inferRole(account, currentUser?.role),
    [account, currentUser?.role],
  );
  const roleCopy = getRoleCopy(inferredRole);
  const currentRolePath = getRoleHomePath(currentUser?.role);

  const handlePrimaryAction = async () => {
    if (currentUser) {
      router.push(currentRolePath);
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
      setSubmitError(
        error instanceof Error ? error.message : '登录失败，请稍后重试。',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-5 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle_at_top,rgba(122,215,255,0.36),transparent_56%)]" />
      <div className="pointer-events-none absolute left-[4%] top-28 h-16 w-32 rounded-full bg-white/85 blur-[2px]" />
      <div className="pointer-events-none absolute right-[10%] top-20 h-20 w-40 rounded-full bg-white/80 blur-[2px]" />
      <div className="pointer-events-none absolute left-6 bottom-16 h-24 w-24 rounded-full bg-[#bbf269]/30 blur-2xl" />
      <div className="pointer-events-none absolute right-8 bottom-12 h-28 w-28 rounded-full bg-[#ffd878]/30 blur-2xl" />

      <div className="mx-auto max-w-7xl">
        <header className="sticky top-4 z-20 mb-8 rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(234,245,255,0.95),rgba(201,230,255,0.9))] px-5 py-4 shadow-[0_18px_45px_rgba(98,167,223,0.2)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="home-lab-pressable flex items-center gap-3 rounded-[1.6rem] border border-white/80 bg-white/80 px-3 py-2 shadow-[0_8px_18px_rgba(96,161,212,0.16)]">
                <div className="rounded-[1.25rem] bg-[linear-gradient(180deg,#f7fcff,#dff4ff)] p-2 shadow-inner">
                  <EinsteinMark />
                </div>
                <div>
                  <p className="font-home text-lg font-bold text-[#25455d]">爱因思学园</p>
                  <p className="text-xs text-[#5f7b90]">科学探索感的小学数学学习入口</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <nav className="flex flex-wrap items-center justify-end gap-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="home-lab-nav-button font-home text-[15px] text-[#33414d]"
                >
                  {item.title}
                </Link>
              ))}
              </nav>
              <div className="rounded-full border border-white/75 bg-white/75 px-4 py-2 text-sm font-semibold text-[#446178] shadow-[0_10px_18px_rgba(122,178,215,0.16)]">
                {currentUser ? `${currentUser.displayName} 已登录` : '欢迎来到科学探索模式'}
              </div>
            </div>
          </div>
        </header>

        <div className="relative">
          <div className="pointer-events-none absolute left-1/2 top-0 hidden -translate-x-1/2 lg:block">
            <div className="rounded-[2rem] bg-[linear-gradient(180deg,#8fe6ff,#59cfe8)] px-8 pb-4 pt-2 shadow-[0_18px_40px_rgba(74,182,211,0.28)]">
              <EinsteinMark />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.03fr_0.97fr] lg:pt-24">
            <section className="relative rounded-[2rem] border-[3px] border-[#f4c45c] bg-[linear-gradient(180deg,rgba(255,249,230,0.97),rgba(255,243,214,0.96))] p-6 shadow-[0_24px_50px_rgba(198,163,79,0.22)] sm:p-8">
              <div className="pointer-events-none absolute inset-x-6 top-0 h-10 rounded-b-[1.2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.65),transparent)]" />
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#cc9b2b] bg-[linear-gradient(180deg,#ffe76f,#ffc839)] text-lg font-black text-[#4f4a1d] shadow-[0_8px_14px_rgba(255,193,62,0.35)]">
                  登
                </div>
                <div>
                  <h1 className="font-home text-[2rem] font-black leading-tight text-[#28221f] sm:text-[2.35rem]">
                    选择你的身份进入地
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[#5f5b53]">
                    登录时优先识别角色并跳转到合适页面，不需要反复切换。整体保留你现有的学习、AI
                    答疑与管理功能，只把首页换成更完整的儿童教育科技风入口。
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-5">
                <form
                  className="space-y-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handlePrimaryAction();
                  }}
                >
                  <label className="block">
                    <span className="mb-2 block font-home text-sm font-bold text-[#3c3a30]">
                      学号或账号
                    </span>
                    <input
                      value={account}
                      onChange={(event) => setAccount(event.target.value)}
                      placeholder="请输入学号、教师工号或管理员账号"
                      className="home-lab-input"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block font-home text-sm font-bold text-[#3c3a30]">
                      密码
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="请输入密码"
                      className="home-lab-input"
                    />
                  </label>

                  <div className="rounded-[1.45rem] border border-[#ecd983] bg-[linear-gradient(180deg,#fffbd2,#fff2af)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_16px_rgba(199,174,79,0.15)]">
                    <p className="font-home text-sm font-extrabold text-[#4c5f1e]">自动识别结果</p>
                    <p className="mt-2 font-home text-[1.65rem] font-black leading-tight text-[#233f12]">
                      当前将进入：{roleCopy.headline}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#6c7a60]">{roleCopy.description}</p>
                    <p className="mt-3 text-xs text-[#7f7b71]">
                      登录后跳转路径：
                      {currentUser ? currentRolePath : getRoleHomePath(inferredRole)}
                    </p>
                  </div>

                  {submitError ? (
                    <div className="rounded-[1.2rem] border border-[#f2b8b8] bg-[#fff1f1] px-4 py-3 text-sm text-[#bf3f3f]">
                      {submitError}
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="home-lab-primary-button w-full font-home text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {submitting
                        ? '正在识别身份并登录...'
                        : currentUser
                          ? '进入当前身份首页'
                          : roleCopy.buttonLabel}
                    </button>
                    <Link
                      href="/student/ai-qa"
                      className="home-lab-secondary-button inline-flex items-center justify-center px-5 py-4 font-home text-sm font-bold text-[#3e5473]"
                    >
                      AI答疑
                    </Link>
                  </div>
                </form>

                <div className="rounded-[1.55rem] border border-[#dceaa7] bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(246,255,219,0.78))] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-home text-sm font-extrabold text-[#486248]">演示账号</p>
                      <p className="mt-1 text-xs text-[#76806f]">
                        点一下即可填充，不影响现有接口与角色逻辑。
                      </p>
                    </div>
                    <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#6b7b86]">
                      快速体验
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {demoAccounts.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setAccount(item.account);
                          setPassword(item.password);
                          setSubmitError('');
                        }}
                        className="home-lab-secondary-button rounded-[1.15rem] px-4 py-3 text-left"
                      >
                        <span className="block font-home text-sm font-black text-[#2f4e65]">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-xs text-[#687888]">{item.account}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border-[3px] border-[#f2c66a] bg-[linear-gradient(180deg,rgba(255,250,238,0.96),rgba(255,247,228,0.98))] p-6 shadow-[0_24px_50px_rgba(198,163,79,0.18)] sm:p-8">
              <div className="flex items-center gap-3">
                <div className="hidden rounded-[1.25rem] bg-[linear-gradient(180deg,#effbff,#dbf4ff)] p-3 shadow-inner sm:block">
                  <EinsteinMark variant="student" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6a8ba7]">
                    Role Access
                  </p>
                  <h2 className="font-home text-[2rem] font-black text-[#2d2723]">
                    不同角色入职阶梯专区
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {roleCards.map((item) => (
                  <Link
                    key={item.role}
                    href={item.path}
                    className={`home-lab-role-card bg-gradient-to-r ${item.toneClass}`}
                  >
                    <div
                      className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.4rem] border border-white/70 bg-gradient-to-br ${item.iconToneClass} shadow-[0_12px_20px_rgba(255,255,255,0.35)]`}
                    >
                      <EinsteinMark
                        variant={
                          item.role === 'TEACHER'
                            ? 'teacher'
                            : item.role === 'ADMIN'
                              ? 'admin'
                              : 'student'
                        }
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-home text-2xl font-black text-[#2f2925]">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[#5f6474]">
                        {item.description}
                      </p>
                      <p className="mt-3 text-sm font-semibold text-[#6f7e93]">
                        登录入口：{item.path}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-6 left-2 hidden opacity-75 lg:block">
        <div className="rounded-[2rem] bg-white/40 px-4 py-3 backdrop-blur-sm">
          <EinsteinMark variant="student" />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-6 right-2 hidden opacity-70 lg:block">
        <div className="rounded-[2rem] bg-white/40 px-4 py-3 backdrop-blur-sm">
          <EinsteinMark variant="admin" />
        </div>
      </div>
    </section>
  );
}
