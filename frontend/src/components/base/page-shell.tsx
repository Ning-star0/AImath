'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
import { getRoleProfilePath } from '@/lib/role-route';
import { useUserStore } from '@/store/use-user-store';

interface PageShellProps {
  title: string;
  description: string;
  children: ReactNode;
  showPageIntro?: boolean;
  navItems?: Array<{ href: string; label: string }>;
}

const studentNavItems = [
  { href: '/student', label: '学生首页' },
  { href: '/student/practice', label: '练习闯关' },
  { href: '/student/ai-qa', label: 'AI讲题' },
  { href: '/student/wrongbook', label: '错题本' },
  { href: '/student/reports', label: '学习报告' },
];

function getUserDisplayName(displayName?: string | null) {
  if (!displayName) {
    return '数学伙伴';
  }

  return displayName.length > 6 ? `${displayName.slice(0, 6)}...` : displayName;
}

function getRoleLabel(pathname: string) {
  if (pathname.startsWith('/admin')) {
    return '管理后台';
  }

  if (pathname.startsWith('/teacher')) {
    return '教师专区';
  }

  return '学生学习中心';
}

function getRoleQuickAction(pathname: string) {
  if (pathname.startsWith('/admin')) {
    return { href: '/admin/questions', label: '去管理题库' };
  }

  if (pathname.startsWith('/teacher')) {
    return { href: '/teacher/students', label: '查看学生列表' };
  }

  return { href: '/student/practice', label: '继续数学练习' };
}

function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getRoleMood(pathname: string): 'guide' | 'celebrate' | 'focus' {
  if (pathname.startsWith('/student/practice') || pathname.startsWith('/student/reports')) {
    return 'celebrate';
  }

  if (pathname.startsWith('/teacher') || pathname.startsWith('/admin')) {
    return 'focus';
  }

  return 'guide';
}

export function PageShell({
  title,
  description,
  children,
  showPageIntro = true,
  navItems,
}: PageShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const currentUser = useUserStore((state) => state.currentUser);
  const clearSession = useUserStore((state) => state.clearSession);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const mergedNavItems = navItems ?? studentNavItems;
  const accountLabel = useMemo(
    () => getUserDisplayName(currentUser?.displayName),
    [currentUser?.displayName],
  );
  const profilePath = getRoleProfilePath(currentUser?.role);
  const roleLabel = getRoleLabel(pathname);
  const mood = getRoleMood(pathname);
  const quickAction = getRoleQuickAction(pathname);

  const handleLogout = () => {
    clearSession();
    setMenuOpen(false);
    router.push('/login');
  };

  const handleGoProfile = () => {
    setMenuOpen(false);
    router.push(profilePath);
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-2 top-24 h-28 w-28 rounded-full bg-[#FFEB3B]/25 blur-3xl" />
      <div className="pointer-events-none absolute right-8 top-40 h-36 w-36 rounded-full bg-[#3F51B5]/16 blur-3xl" />

      <header className="math-card math-panel math-symbol-strip relative mb-8 rounded-[2rem] px-5 py-5 sm:px-6">
        <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 rounded-tr-[3rem] bg-[#4CAF50]/12" />
        <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-[3rem] bg-[#FF9800]/10" />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="hidden rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(238,243,255,0.88))] p-3 shadow-[0_14px_28px_rgba(63,81,181,0.12)] md:block">
                <EinsteinMentor size="sm" mood={mood} badge="导师" />
              </div>
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="math-chip math-chip-primary">爱因数学星球</span>
                  <span className="math-chip math-chip-success">{roleLabel}</span>
                  <span className="math-chip math-chip-warm">练习 + AI讲题 + 错题 + 报告</span>
                </div>
                {showPageIntro ? (
                  <>
                    <h1 className="font-math-display text-3xl font-extrabold text-ink sm:text-4xl">
                      {title}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                      {description}
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="font-math-display text-3xl font-extrabold text-ink sm:text-4xl">
                      爱因数学星球
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                      面向小学 1-6 年级的数学智能学习平台，把练习、AI讲题、错题沉淀、学习报告和多角色管理连成一条完整学习闭环。
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link
                href={quickAction.href}
                className="math-button-secondary hidden rounded-[1rem] px-4 py-2 text-sm font-extrabold text-slate-700 sm:inline-flex"
              >
                {quickAction.label}
              </Link>
              <div className="hidden rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-[#607D8B] shadow-[0_12px_24px_rgba(96,125,139,0.12)] lg:block">
                + - × ÷ = √ π
              </div>
              {currentUser ? (
                <div ref={menuRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    className="math-button-secondary flex items-center gap-3 px-3 py-2 text-sm font-bold text-brand-700"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-black text-brand-700">
                      {accountLabel.slice(0, 1)}
                    </span>
                    <span>{accountLabel}</span>
                  </button>

                  {menuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-48 rounded-[1.2rem] border border-brand-100 bg-white p-2 shadow-card">
                      <button
                        type="button"
                        onClick={handleGoProfile}
                        className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
                      >
                        进入个人中心
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 flex w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                      >
                        退出登录
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="math-button-primary inline-flex items-center rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white"
                >
                  进入平台
                </Link>
              )}
            </div>
          </div>

          <div className="math-role-panel flex flex-col gap-4 rounded-[1.6rem] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-[1.2rem] bg-white/90 p-2 shadow-sm">
                <EinsteinMentor size="sm" mood={mood} badge={pathname.startsWith('/student') ? '陪学' : pathname.startsWith('/teacher') ? '助教' : '导航'} />
              </div>
              <div>
                <p className="font-math-display text-xl font-extrabold text-ink">
                  {pathname.startsWith('/student')
                    ? '今天先完成任务，再回看成长'
                    : pathname.startsWith('/teacher')
                      ? '先看班级总览，再决定跟进对象'
                      : '先看系统概览，再处理题库与用户'}
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  {pathname.startsWith('/student')
                    ? '这里不是普通控制台，而是你的数学学习路径起点。'
                    : pathname.startsWith('/teacher')
                      ? '教师端更稳重，但仍然属于同一套小学数学平台。'
                      : '管理端更偏效率工具，但品牌感和产品归属要持续可见。'}
                </p>
              </div>
            </div>
            <Link
              href={quickAction.href}
              className="math-button-primary inline-flex rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white"
            >
              {quickAction.label}
            </Link>
          </div>

          <nav className="grid gap-2 rounded-[1.6rem] bg-white/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:grid-cols-3 lg:grid-cols-5">
            {mergedNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`math-lift rounded-[1rem] border px-4 py-3 text-center text-sm font-extrabold ${
                  isNavActive(pathname, item.href)
                    ? 'border-brand-700 bg-brand-700 text-white shadow-[0_14px_28px_rgba(63,81,181,0.26)]'
                    : 'border-brand-100 bg-white/80 text-slate-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
