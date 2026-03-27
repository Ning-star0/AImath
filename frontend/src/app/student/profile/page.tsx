'use client';

import { useEffect, useState } from 'react';
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

  return (
    <PageShell
      title="个人中心"
      description="在这里管理你的学习档案。修改年级后，练习、AI 答疑和学习报告都会自动按新的年级来匹配。"
    >
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/70 bg-white/92 p-7 shadow-card sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
            我的成长等级
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.75rem] border border-violet-100 bg-violet-50/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-violet-700">当前等级</p>
                  <p className="mt-2 text-3xl font-bold text-violet-700">
                    Lv.{rewardProgress.level}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-violet-700">
                    {levelTitle.title}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    {levelTitle.subtitle}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                  <p className="text-xs text-slate-400">闯关星星</p>
                  <p className="mt-1 text-2xl font-bold text-amber-600">
                    {rewardState.totalStars} ⭐
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>当前经验 {rewardProgress.currentExp}</span>
                  <span>升级需要 {rewardProgress.expToNextLevel}</span>
                </div>
                <ProgressBar
                  value={rewardProgress.currentExp}
                  total={rewardProgress.expToNextLevel}
                  tone="purple"
                />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50/80 p-5">
              <p className="text-sm text-emerald-700">连续学习</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {rewardState.streakDays} 天
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                每天坚持练习、完成任务、答题得星星，经验就会慢慢涨起来。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/70 bg-white/92 p-7 shadow-card sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
            学习档案
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">设置你的当前年级</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            这里的年级会影响默认练习题、AI 讲解难度和学习报告的推荐内容。
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-5">
              <label className="block text-sm font-medium text-slate-700">
                当前年级
              </label>
              <select
                value={grade}
                onChange={(event) => setGrade(Number(event.target.value))}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-500"
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
                className="mt-5 inline-flex items-center rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? '正在保存...' : '保存年级设置'}
              </button>

              {message ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-brand-100 bg-brand-50/70 p-5">
              <h3 className="text-lg font-semibold text-ink">修改后会发生什么</h3>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                <p>1. 练习页会默认优先展示你当前年级的题目。</p>
                <p>2. AI 讲解会尽量按这个年级的理解方式来说明。</p>
                <p>3. 学习首页和报告页会按新年级调整推荐内容。</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
