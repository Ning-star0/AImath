'use client';

import { useEffect, useState } from 'react';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
import { PageShell } from '@/components/base/page-shell';
import { ProgressBar } from '@/components/student-home/progress-bar';
import { getLevelTitle, getRewardProgress, readRewardState } from '@/lib/game-rewards';
import { authService } from '@/services/auth.service';
import { useUserStore } from '@/store/use-user-store';

const gradeOptions = [1, 2, 3, 4, 5, 6];

export default function StudentProfilePage() {
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const currentUser = useUserStore((state) => state.currentUser);
  const accessToken = useUserStore((state) => state.accessToken);
  const setSession = useUserStore((state) => state.setSession);

  const [grade, setGrade] = useState(3);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rewardState, setRewardState] = useState({
    totalStars: 0,
    streakDays: 0,
  });

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const resolvedGrade = currentUser?.grade ?? currentUser?.student?.grade ?? 3;
    setGrade(resolvedGrade);
  }, [currentUser]);

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

  const handleSave = async () => {
    if (!accessToken) {
      setError('登录状态已失效，请重新登录。');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const updatedUser = await authService.updateStudentProfile({ grade });
      setSession(accessToken, updatedUser);
      setMessage(`已为你切换到 ${grade} 年级，后续练习和学习建议会自动按新年级调整。`);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : '保存失败，请稍后重试。',
      );
    } finally {
      setSaving(false);
    }
  };

  const rewardProgress = getRewardProgress(rewardState.totalStars);
  const levelTitle = getLevelTitle(rewardProgress.level);
  const studentCode = currentUser?.studentCode ?? currentUser?.student?.studentCode ?? '未设置';

  return (
    <PageShell
      title="我的数学成长档案"
      description="这里不是普通设置页，而是属于你的数学成长档案。你可以看到自己的年级、成长等级、星星奖励和学习身份。"
    >
      <div className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
          <article className="math-card rounded-[2rem] px-6 py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="math-chip math-chip-primary">成长档案</span>
                  <span className="math-chip math-chip-success">学生身份</span>
                </div>
                <h2 className="font-math-display text-3xl font-extrabold text-ink">
                  {currentUser?.displayName ?? '数学小队员'}，欢迎回来
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  这里会保存你的学习身份、成长进度和当前年级，让练习、AI 讲解和学习报告都更贴合你现在的学习阶段。
                </p>
              </div>
              <div className="rounded-[1.8rem] bg-[linear-gradient(180deg,#F8FBFF,#EEF4FF)] p-3">
                <EinsteinMentor size="md" mood="celebrate" badge="档案" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] bg-[#EEF1FF] px-4 py-5">
                <p className="text-sm font-semibold text-slate-500">当前年级</p>
                <p className="mt-2 font-math-display text-3xl font-extrabold text-brand-700">
                  {grade} 年级
                </p>
              </div>
              <div className="rounded-[1.4rem] bg-[#E8F5E9] px-4 py-5">
                <p className="text-sm font-semibold text-slate-500">学生编号</p>
                <p className="mt-2 font-math-display text-2xl font-extrabold text-[#2E7D32]">
                  {studentCode}
                </p>
              </div>
              <div className="rounded-[1.4rem] bg-[#FFF8E1] px-4 py-5">
                <p className="text-sm font-semibold text-slate-500">角色身份</p>
                <p className="mt-2 font-math-display text-3xl font-extrabold text-[#EF6C00]">
                  学生
                </p>
              </div>
            </div>
          </article>

          <article className="math-card rounded-[2rem] px-6 py-6">
            <h2 className="font-math-display text-3xl font-extrabold text-ink">成长勋章墙</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] bg-[#F3E5F5] px-4 py-5 text-center">
                <p className="text-sm text-violet-700">成长等级</p>
                <p className="mt-2 text-3xl font-bold text-violet-700">Lv.{rewardProgress.level}</p>
                <p className="mt-2 text-xs text-slate-500">{levelTitle.title}</p>
              </div>
              <div className="rounded-[1.4rem] bg-[#FFF8E1] px-4 py-5 text-center">
                <p className="text-sm text-amber-700">成长星星</p>
                <p className="mt-2 text-3xl font-bold text-amber-600">{rewardState.totalStars} ★</p>
                <p className="mt-2 text-xs text-slate-500">做题和完成任务获得</p>
              </div>
              <div className="rounded-[1.4rem] bg-[#E8F5E9] px-4 py-5 text-center">
                <p className="text-sm text-emerald-700">连续学习</p>
                <p className="mt-2 text-3xl font-bold text-emerald-700">{rewardState.streakDays} 天</p>
                <p className="mt-2 text-xs text-slate-500">坚持越久越厉害</p>
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
                  <span>还差 {rewardProgress.expToNextLevel - rewardProgress.currentExp}</span>
                </div>
                <ProgressBar
                  value={rewardProgress.currentExp}
                  total={rewardProgress.expToNextLevel}
                  tone="purple"
                />
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-amber-100 bg-[#FFF8E1] p-5">
              <h3 className="font-math-display text-2xl font-extrabold text-ink">成就徽章</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[1.2rem] bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700">
                  数学闯关者
                </div>
                <div className="rounded-[1.2rem] bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700">
                  AI 提问小能手
                </div>
                <div className="rounded-[1.2rem] bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700">
                  连续学习达人
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="math-card rounded-[2rem] px-7 py-7">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">学习档案设置</p>
          <h2 className="mt-2 font-math-display text-3xl font-extrabold text-ink">设置你的当前年级</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            这里的年级会影响默认练习题、AI 讲解难度和学习报告中的推荐内容。
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-[1.6rem] border border-slate-100 bg-slate-50/80 p-5">
              <label className="block text-sm font-semibold text-slate-700">
                当前年级
              </label>
              <select
                value={grade}
                onChange={(event) => setGrade(Number(event.target.value))}
                className="math-input mt-3"
              >
                {gradeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option} 年级
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="math-button-primary mt-5 inline-flex items-center rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? '正在保存...' : '保存年级设置'}
              </button>

              {message ? (
                <div className="mt-4 rounded-[1rem] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-[1rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.6rem] border border-brand-100 bg-brand-50/70 p-5">
              <h3 className="font-math-display text-2xl font-extrabold text-ink">修改后会发生什么</h3>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                <p>1. 练习页会优先显示你当前年级的题目。</p>
                <p>2. AI 讲解会尽量按这个年级的理解方式来说明。</p>
                <p>3. 学习首页和学习报告会按新年级调整推荐内容。</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
