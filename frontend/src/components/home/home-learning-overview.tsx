'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/services/auth.service';
import { reportService } from '@/services/report.service';
import { wrongbookService } from '@/services/wrongbook.service';
import { useUserStore } from '@/store/use-user-store';
import type {
  ReportOverviewResult,
  WrongbookListResult,
  WrongbookStatsResult,
} from '@/types/api';

export function HomeLearningOverview() {
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const setSession = useUserStore((state) => state.setSession);
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);

  const [report, setReport] = useState<ReportOverviewResult | null>(null);
  const [wrongbook, setWrongbook] = useState<WrongbookListResult | null>(null);
  const [wrongbookStats, setWrongbookStats] = useState<WrongbookStatsResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const loadData = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        if (!currentUser) {
          const profile = await authService.getCurrentUser();
          setSession(accessToken, profile);
        }

        const [reportData, wrongbookData, wrongbookStatsData] = await Promise.all([
          reportService.getOverview(7),
          wrongbookService.getList({
            unresolvedOnly: true,
            grade: currentUser?.grade ?? currentUser?.student?.grade ?? 3,
          }),
          wrongbookService.getStats(),
        ]);

        setReport(reportData);
        setWrongbook(wrongbookData);
        setWrongbookStats(wrongbookStatsData);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : '学习数据加载失败，请稍后再试。',
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [accessToken, currentUser, setSession]);

  const recentWrongItems = wrongbook?.list.slice(0, 3) ?? [];
  const recentPracticeItems = report?.learningTrend.slice(-3).reverse() ?? [];

  return (
    <section className="mx-auto mt-2 max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#6d90a8]">
            Learning Snapshot
          </p>
          <h2 className="font-home text-3xl font-black text-[#28405d]">
            学习数据观察站
          </h2>
        </div>
        <div className="rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold text-[#577389] shadow-[0_10px_18px_rgba(122,178,215,0.16)] backdrop-blur">
          科学探索式成长看板
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(245,252,255,0.92),rgba(255,255,255,0.95))] p-8 shadow-[0_24px_48px_rgba(104,166,210,0.16)] backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6a8da7]">
                学习进度
              </p>
              <h3 className="font-home mt-3 text-2xl font-black text-[#24384e]">
                看看最近的学习状态
              </h3>
            </div>
            <div className="rounded-full border border-[#d0ecff] bg-[#edf9ff] px-4 py-2 text-sm font-semibold text-[#36749b]">
              {currentUser?.grade ?? currentUser?.student?.grade ?? 3} 年级
            </div>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-slate-500">正在准备你的学习数据...</p>
          ) : null}

          {!accessToken && !loading ? (
            <p className="mt-6 text-sm leading-7 text-slate-600">
              登录后可以看到今天的学习进度、最近错题和练习记录。
            </p>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          {accessToken && report ? (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="home-lab-stat-card bg-[linear-gradient(180deg,#eefbff,#ddf5ff)]">
                <p className="text-sm text-slate-500">总做题数</p>
                <p className="mt-2 font-home text-3xl font-black text-[#2777a6]">
                  {report.totalQuestions}
                </p>
              </div>
              <div className="home-lab-stat-card bg-[linear-gradient(180deg,#efffec,#e0f9db)]">
                <p className="text-sm text-slate-500">正确率</p>
                <p className="mt-2 font-home text-3xl font-black text-[#2f8e3d]">
                  {report.accuracyRate}%
                </p>
              </div>
              <div className="home-lab-stat-card bg-[linear-gradient(180deg,#fff8de,#fff0bd)]">
                <p className="text-sm text-slate-500">待复习错题</p>
                <p className="mt-2 font-home text-3xl font-black text-[#b17b14]">
                  {wrongbookStats?.unresolvedCount ?? 0}
                </p>
              </div>
              <div className="home-lab-stat-card bg-[linear-gradient(180deg,#f6f0ff,#ece2ff)]">
                <p className="text-sm text-slate-500">AI 答疑次数</p>
                <p className="mt-2 font-home text-3xl font-black text-[#7351c9]">
                  {report.aiQaCount ?? 0}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,251,239,0.94),rgba(255,255,255,0.96))] p-8 shadow-[0_24px_48px_rgba(190,157,75,0.14)] backdrop-blur">
          <h3 className="font-home text-2xl font-black text-[#413623]">最近错题</h3>
          <div className="mt-5 space-y-4">
            {recentWrongItems.length === 0 ? (
              <p className="text-sm leading-7 text-slate-600">
                目前还没有新的错题记录，继续保持。
              </p>
            ) : (
              recentWrongItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.4rem] border border-[#f1deaf] bg-[linear-gradient(180deg,#fffef7,#fff7db)] p-5 shadow-[0_12px_20px_rgba(211,183,110,0.12)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_28px_rgba(211,183,110,0.18)]"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="font-home text-lg font-black text-[#3b3229]">
                      {item.questionTitle}
                    </h4>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                      已错 {item.wrongCount} 次
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.questionStem}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(243,248,255,0.94),rgba(255,255,255,0.96))] p-8 shadow-[0_24px_48px_rgba(109,145,195,0.14)] backdrop-blur">
        <h3 className="font-home text-2xl font-black text-[#2c3b58]">最近练习记录</h3>
        <div className="mt-5 space-y-4">
          {recentPracticeItems.length === 0 ? (
            <p className="text-sm leading-7 text-slate-600">
              还没有新的练习记录，去题库练习页完成第一组题吧。
            </p>
          ) : (
            recentPracticeItems.map((item) => (
              <article
                key={item.date}
                className="rounded-[1.45rem] border border-[#d9e8ff] bg-[linear-gradient(90deg,#eef6ff,#ffffff)] p-5 shadow-[0_12px_20px_rgba(133,164,214,0.12)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_28px_rgba(133,164,214,0.18)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-home text-lg font-black text-[#33425d]">
                      {item.date}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {(item.practiceCount ?? 0)} 次练习 · {(item.totalQuestions ?? 0)} 题
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">正确率</p>
                    <p className="font-home text-2xl font-black text-[#3366b4]">
                      {item.accuracyRate}%
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      </div>
    </section>
  );
}
