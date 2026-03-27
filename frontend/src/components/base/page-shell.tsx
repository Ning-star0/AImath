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

const defaultNavItems = [
  { href: '/', label: '首页' },
  { href: '/student/practice', label: '练习' },
  { href: '/student/ai-qa', label: 'AI 答疑' },
  { href: '/student/wrongbook', label: '错题本' },
  { href: '/student/reports', label: '学习报告' },
];

function getUserDisplayName(displayName?: string | null) {
  if (!displayName) {
    return '我的';
  }

  return displayName.length > 4 ? `${displayName.slice(0, 4)}...` : displayName;
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

  const mergedNavItems = navItems ?? defaultNavItems;
  const accountLabel = useMemo(
    () => getUserDisplayName(currentUser?.displayName),
    [currentUser?.displayName],
  );
  const profilePath = getRoleProfilePath(currentUser?.role);

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
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(245,253,249,0.95),rgba(243,248,255,0.92))] p-6 shadow-float backdrop-blur">
        <div className="pointer-events-none absolute -left-6 top-8 h-24 w-24 rounded-full bg-brand-100/70 blur-2xl" />
        <div className="pointer-events-none absolute right-10 top-6 h-20 w-20 rounded-full bg-sky-100/80 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 right-24 h-16 w-16 rounded-full bg-violet-100/80 blur-2xl" />
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
                  <span className="animate-bob text-base">🤖</span>
                  <span>小数老师在线</span>
                </div>
                <div className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-sky-700 shadow-sm">
                  今日学习模式
                </div>
              </div>
              {showPageIntro ? (
                <>
                  <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                    {description}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="font-display text-3xl font-bold text-ink">
                    小学数学智能辅导系统
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                    像一位会鼓励人的学习伙伴，陪学生练习、答疑、复习和一点点进步。
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-end">
              {currentUser ? (
                <div ref={menuRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    className="flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {accountLabel.slice(0, 1)}
                    </span>
                    <span className="hidden sm:inline">{accountLabel}</span>
                    <span className="text-xs text-slate-400">{menuOpen ? '▲' : '▼'}</span>
                  </button>

                  {menuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-44 rounded-2xl border border-slate-100 bg-white p-2 shadow-card">
                      <button
                        type="button"
                        onClick={handleGoProfile}
                        className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
                      >
                        进入个人中心
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                      >
                        退出登录
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="shrink-0 whitespace-nowrap rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500 hover:bg-white"
                >
                  登录
                </Link>
              )}
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 rounded-[1.5rem] bg-white/75 p-2 shadow-sm">
            {mergedNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full border px-3 py-2 text-sm font-medium shadow-sm transition lg:px-4 ${
                  pathname === item.href
                    ? 'border-brand-600 bg-brand-700 text-white'
                    : 'border-brand-100 bg-brand-50 text-brand-700 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-white'
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
