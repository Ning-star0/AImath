'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { getRoleProfilePath } from '@/lib/role-route';
import { useUserStore } from '@/store/use-user-store';
import type { UserRole } from '@/types/api';

interface PageShellProps {
  title: string;
  description: string;
  children: ReactNode;
  showPageIntro?: boolean;
  navItems?: Array<{ href: string; label: string }>;
}

const studentNavItems = [
  { href: '/student', label: '首页' },
  { href: '/student/practice', label: '练习' },
  { href: '/student/ai-qa', label: 'AI讲题' },
  { href: '/student/wrongbook', label: '错题本' },
  { href: '/student/reports', label: '报告' },
];

const studentTabItems = [
  { href: '/student', label: '首页', icon: '🏠' },
  { href: '/student/practice', label: '练习', icon: '✏️' },
  { href: '/student/ai-qa', label: 'AI讲题', icon: '💡' },
  { href: '/student/wrongbook', label: '错题本', icon: '📖' },
  { href: '/student/reports', label: '报告', icon: '📊' },
];

const familyNavItems = [
  { href: '/family', label: '孩子总览' },
  { href: '/student/ai-qa', label: 'AI 讲题' },
];

function getUserDisplayName(displayName?: string | null) {
  if (!displayName) {
    return '数学伙伴';
  }

  return displayName.length > 6 ? `${displayName.slice(0, 6)}...` : displayName;
}

function getRoleLabel(pathname: string, role?: UserRole | null) {
  if (role === 'ADMIN') return '管理端';
  if (role === 'TEACHER') return '教师端';
  if (role === 'PARENT') return '家长端';
  if (role === 'STUDENT') return '学生端';
  if (pathname.startsWith('/admin')) return '管理端';
  if (pathname.startsWith('/teacher')) return '教师端';
  if (pathname.startsWith('/family')) return '家长端';
  return '学生端';
}

function getDefaultNavItems(pathname: string, role?: UserRole | null) {
  if (role === 'PARENT') return familyNavItems;
  if (role === 'STUDENT') return studentNavItems;
  if (pathname.startsWith('/family')) return familyNavItems;
  return studentNavItems;
}

function isNavActive(pathname: string, href: string) {
  if (href === '/student' || href === '/teacher' || href === '/admin' || href === '/family') {
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  const mergedNavItems = navItems ?? getDefaultNavItems(pathname, currentUser?.role);
  const accountLabel = useMemo(
    () => getUserDisplayName(currentUser?.displayName),
    [currentUser?.displayName],
  );
  const profilePath = getRoleProfilePath(currentUser?.role);
  const roleLabel = getRoleLabel(pathname, currentUser?.role);
  const shouldShowDescription = showPageIntro && !pathname.startsWith('/student');
  const isStudent = currentUser?.role === 'STUDENT' || pathname.startsWith('/student');
  const showBottomTabs = isStudent && currentUser;

  const handleLogout = () => {
    clearSession();
    setMenuOpen(false);
    router.push('/login');
  };

  const supportLinks =
    currentUser?.role === 'ADMIN' || pathname.startsWith('/admin')
      ? [
          { href: '/teacher', label: '教师端' },
          { href: '/student', label: '学生端' },
          { href: '/family', label: '家长端' },
        ]
      : currentUser?.role === 'TEACHER' || pathname.startsWith('/teacher')
        ? [
            { href: '/student', label: '学生端' },
            { href: '/family', label: '家长端' },
            { href: '/admin', label: '管理端' },
          ]
        : [
            { href: '/teacher', label: '教师端' },
            { href: '/admin', label: '管理端' },
          ];

  return (
    <div className={`relative mx-auto min-h-screen max-w-7xl ${showBottomTabs ? 'pb-20 sm:pb-0' : ''}`}>
      {/* Mobile compact header */}
      <header className="sticky top-0 z-30 bg-white sm:relative sm:bg-transparent">
        <div className="flex items-center justify-between px-4 py-2.5 sm:hidden">
          <span className="text-base font-bold text-ink">爱因数学</span>
          {currentUser ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-black text-brand-700"
              >
                {accountLabel.slice(0, 1)}
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-44 rounded-xl border border-slate-100 bg-white p-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push(profilePath);
                    }}
                    className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    个人中心
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-0.5 flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                  >
                    退出登录
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white"
            >
              登录
            </Link>
          )}
        </div>

        {/* Desktop header */}
        <div className="hidden sm:block">
          <div className="portal-board relative mb-4 px-5 py-4 lg:px-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="math-chip math-chip-primary">爱因数学星球</span>
                    <span className="math-chip math-chip-success">{roleLabel}</span>
                  </div>
                  <h1 className="font-math-display text-2xl font-extrabold text-ink lg:text-3xl">
                    {showPageIntro ? title : '爱因数学星球'}
                  </h1>
                  {shouldShowDescription ? (
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {currentUser ? (
                    <div className="relative shrink-0">
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
                            onClick={() => {
                              setMenuOpen(false);
                              router.push(profilePath);
                            }}
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

              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <nav className="flex flex-wrap gap-2 rounded-[1.2rem] bg-white p-2 shadow-sm">
                  {mergedNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-[0.95rem] border px-4 py-2.5 text-center text-sm font-extrabold ${
                        isNavActive(pathname, item.href)
                          ? 'border-[#1A8E38] bg-[#1A8E38] text-white shadow-[0_12px_24px_rgba(26,142,56,0.2)]'
                          : 'border-[#F7D672] bg-white text-slate-700'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                  <span>其他入口</span>
                  {supportLinks.map((item) => (
                    <Link key={item.href} href={item.href} className="underline-offset-4 hover:text-brand-700 hover:underline">
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-3 sm:px-5 sm:py-0 lg:px-6">{children}</main>

      {/* Mobile bottom tab bar */}
      {showBottomTabs ? (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-100 bg-white sm:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-1">
            {studentTabItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                    active ? 'text-brand-700' : 'text-slate-400'
                  }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
