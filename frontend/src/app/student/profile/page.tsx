'use client';

import { useEffect, useState } from 'react';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
import { PageShell } from '@/components/base/page-shell';
import { AuthRequiredState } from '@/components/states/platform-states';
import { ProgressBar } from '@/components/student-home/progress-bar';
import { getLevelTitle, getRewardProgress, readRewardState } from '@/lib/game-rewards';
import { useUserStore } from '@/store/use-user-store';

export default function StudentProfilePage() {
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const currentUser = useUserStore((state) => state.currentUser);
  const accessToken = useUserStore((state) => state.accessToken);
  const [rewardState, setRewardState] = useState({
    totalStars: 0,
    streakDays: 0,
  });

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    const stored = readRewardState(currentUser.id);
    setRewardState({
      totalStars: stored.totalStars,
      streakDays: stored.streakDays,
    });
  }, [currentUser?.id]);

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="我的数学成长档案" description="查看自己的学习身份、班级信息与成长进度。">
        <AuthRequiredState />
      </PageShell>
    );
  }

  const grade = currentUser?.grade ?? currentUser?.student?.grade ?? 3;
  const className = currentUser?.student?.className ?? '未分配班级';
  const schoolName = currentUser?.student?.schoolName ?? '未设置学校';
  const studentCode = currentUser?.studentCode ?? currentUser?.student?.studentCode ?? '未设置';

  const rewardProgress = getRewardProgress(rewardState.totalStars);
  const levelTitle = getLevelTitle(rewardProgress.level);

  return (
    <PageShell
      title="我的数学成长档案"
      description="这里会展示你的年级、班级、学号和成长记录。班级调整需要由管理员统一处理。"
    >
      <div className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
          <article className="math-card rounded-[2rem] px-6 py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="math-chip math-chip-primary">学生档案</span>
                  <span className="math-chip math-chip-success">只读信息</span>
                </div>
                <h2 className="font-math-display text-3xl font-extrabold text-ink">
                  {currentUser?.displayName ?? '同学'}，欢迎回来
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  学生在注册时选择年级和班级。注册完成后，班级与年级信息不会在学生端随意修改；
                  如需调整，将由管理员在后台统一更新，避免学习数据归属混乱。
                </p>
              </div>
              <div className="rounded-[1.8rem] bg-[linear-gradient(180deg,#F8FBFF,#EEF4FF)] p-3">
                <EinsteinMentor size="md" mood="celebrate" badge="档案" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.4rem] bg-[#EEF1FF] px-4 py-5">
                <p className="text-sm font-semibold text-slate-500">当前年级</p>
                <p className="mt-2 font-math-display text-3xl font-extrabold text-brand-700">
                  {grade} 年级
                </p>
              </div>
              <div className="rounded-[1.4rem] bg-[#E8F5E9] px-4 py-5">
                <p className="text-sm font-semibold text-slate-500">班级</p>
                <p className="mt-2 font-math-display text-2xl font-extrabold text-[#2E7D32]">
                  {className}
                </p>
              </div>
              <div className="rounded-[1.4rem] bg-[#FFF8E1] px-4 py-5">
                <p className="text-sm font-semibold text-slate-500">学校</p>
                <p className="mt-2 font-math-display text-2xl font-extrabold text-[#EF6C00]">
                  {schoolName}
                </p>
              </div>
              <div className="rounded-[1.4rem] bg-[#F3E5F5] px-4 py-5">
                <p className="text-sm font-semibold text-slate-500">学号</p>
                <p className="mt-2 font-math-display text-2xl font-extrabold text-violet-700">
                  {studentCode}
                </p>
              </div>
            </div>
          </article>

          <article className="math-card rounded-[2rem] px-6 py-6">
            <h2 className="font-math-display text-3xl font-extrabold text-ink">成长激励</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] bg-[#F3E5F5] px-4 py-5 text-center">
                <p className="text-sm text-violet-700">当前等级</p>
                <p className="mt-2 text-3xl font-bold text-violet-700">Lv.{rewardProgress.level}</p>
                <p className="mt-2 text-xs text-slate-500">{levelTitle.title}</p>
              </div>
              <div className="rounded-[1.4rem] bg-[#FFF8E1] px-4 py-5 text-center">
                <p className="text-sm text-amber-700">成长星星</p>
                <p className="mt-2 text-3xl font-bold text-amber-600">{rewardState.totalStars} 颗</p>
                <p className="mt-2 text-xs text-slate-500">完成练习和任务会持续累积</p>
              </div>
              <div className="rounded-[1.4rem] bg-[#E8F5E9] px-4 py-5 text-center">
                <p className="text-sm text-emerald-700">连续学习</p>
                <p className="mt-2 text-3xl font-bold text-emerald-700">{rewardState.streakDays} 天</p>
                <p className="mt-2 text-xs text-slate-500">保持节奏会更稳</p>
              </div>
            </div>
          </article>
        </section>

        <section className="math-card rounded-[2rem] px-7 py-7">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">成长进度</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.6rem] border border-brand-100 bg-[#EEF4FF] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-brand-700">当前等级</p>
                  <p className="mt-2 text-3xl font-bold text-brand-700">Lv.{rewardProgress.level}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{levelTitle.subtitle}</p>
                </div>
                <div className="rounded-[1.2rem] bg-white px-4 py-3 text-right shadow-sm">
                  <p className="text-xs text-slate-400">当前经验</p>
                  <p className="mt-1 text-2xl font-bold text-brand-700">{rewardProgress.currentExp}</p>
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>升级目标 {rewardProgress.expToNextLevel}</span>
                  <span>还差 {Math.max(0, rewardProgress.expToNextLevel - rewardProgress.currentExp)}</span>
                </div>
                <ProgressBar
                  value={rewardProgress.currentExp}
                  total={rewardProgress.expToNextLevel}
                  tone="purple"
                />
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-amber-100 bg-[#FFF8E1] p-5">
              <h3 className="font-math-display text-2xl font-extrabold text-ink">班级与资料说明</h3>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                <p>1. 学生在注册时选择年级与班级。</p>
                <p>2. 注册完成后，学生端仅展示班级信息，不提供自行修改入口。</p>
                <p>3. 如需转班、升年级或学校调整，请联系管理员在后台统一处理。</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
