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
    <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                学习进度
              </p>
              <h3 className="mt-3 text-2xl font-bold text-ink">看看最近的学习状态</h3>
            </div>
            <div className="rounded-full bg-brand-50 px-4 py-2 text-sm text-brand-700">
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
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-sm text-slate-500">总做题数</p>
                <p className="mt-2 text-3xl font-bold text-brand-700">
                  {report.totalQuestions}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm text-slate-500">正确率</p>
                <p className="mt-2 text-3xl font-bold text-emerald-700">
                  {report.accuracyRate}%
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-sm text-slate-500">待复习错题</p>
                <p className="mt-2 text-3xl font-bold text-amber-700">
                  {wrongbookStats?.unresolvedCount ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-sm text-slate-500">AI 答疑次数</p>
                <p className="mt-2 text-3xl font-bold text-sky-700">
                  {report.aiQaCount ?? 0}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-card">
          <h3 className="text-2xl font-bold text-ink">最近错题</h3>
          <div className="mt-5 space-y-4">
            {recentWrongItems.length === 0 ? (
              <p className="text-sm leading-7 text-slate-600">
                目前还没有新的错题记录，继续保持。
              </p>
            ) : (
              recentWrongItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="font-semibold text-ink">{item.questionTitle}</h4>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">
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

      <section className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-card">
        <h3 className="text-2xl font-bold text-ink">最近练习记录</h3>
        <div className="mt-5 space-y-4">
          {recentPracticeItems.length === 0 ? (
            <p className="text-sm leading-7 text-slate-600">
              还没有新的练习记录，去题库练习页完成第一组题吧。
            </p>
          ) : (
            recentPracticeItems.map((item) => (
              <article
                key={item.date}
                className="rounded-2xl bg-gradient-to-r from-slate-50 to-white p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{item.date}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {(item.practiceCount ?? 0)} 次练习 · {(item.totalQuestions ?? 0)} 题
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">正确率</p>
                    <p className="text-2xl font-bold text-brand-700">
                      {item.accuracyRate}%
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
