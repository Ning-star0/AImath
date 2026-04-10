'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
  { href: '/student', label: '学习首页' },
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
    return '系统管理中心';
  }

  if (pathname.startsWith('/teacher')) {
    return '教师工作台';
  }

  return '学生学习中心';
}

function getRoleQuickAction(pathname: string) {
  if (pathname.startsWith('/admin')) {
    return { href: '/admin/questions', label: '题库管理' };
  }

  if (pathname.startsWith('/teacher')) {
    return { href: '/teacher/students', label: '学生列表' };
  }

  return { href: '/student/practice', label: '继续练习' };
}

function isNavActive(pathname: string, href: string) {
  if (href === '/student' || href === '/teacher' || href === '/admin') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
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
  const accountLabel = useMemo(() => getUserDisplayName(currentUser?.displayName), [currentUser?.displayName]);
  const profilePath = getRoleProfilePath(currentUser?.role);
  const roleLabel = getRoleLabel(pathname);
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
    <div className="storybook-scene relative mx-auto min-h-screen max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-0 top-10 h-24 w-44 rounded-full bg-white/80 blur-sm" />
      <div className="pointer-events-none absolute right-10 top-16 h-24 w-44 rounded-full bg-white/80 blur-sm" />
      <div className="pointer-events-none absolute left-2 top-24 h-28 w-28 rounded-full bg-[#FFEB3B]/25 blur-3xl" />
      <div className="pointer-events-none absolute right-8 top-40 h-36 w-36 rounded-full bg-[#3F51B5]/16 blur-3xl" />

      <header className="portal-board math-symbol-strip relative mb-5 px-4 py-4 sm:px-5">
        <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-20 rounded-tr-[2.4rem] bg-[#4CAF50]/10" />
        <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-bl-[2.4rem] bg-[#FF9800]/8" />

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="math-chip math-chip-primary">爱因数学星球</span>
                <span className="math-chip math-chip-success">{roleLabel}</span>
              </div>
              {showPageIntro ? (
                <h1 className="font-math-display text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
              ) : (
                <h1 className="font-math-display text-2xl font-extrabold text-ink sm:text-3xl">爱因数学星球</h1>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link
                href={quickAction.href}
                className="math-button-secondary hidden rounded-[0.9rem] px-4 py-2 text-sm font-extrabold text-slate-700 sm:inline-flex"
              >
                {quickAction.label}
              </Link>
              <div className="cloud-badge hidden px-3 py-2 text-sm font-bold text-[#607D8B] lg:block">+ - × ÷ = π</div>
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

          <nav className="grid gap-2 rounded-[1.2rem] bg-white/72 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:grid-cols-3 lg:grid-cols-5">
            {mergedNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`math-lift rounded-[0.95rem] border px-4 py-2.5 text-center text-sm font-extrabold ${
                  isNavActive(pathname, item.href)
                    ? 'border-[#1A8E38] bg-[#1A8E38] text-white shadow-[0_14px_28px_rgba(26,142,56,0.22)]'
                    : 'border-[#F7D672] bg-white/86 text-slate-700'
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
