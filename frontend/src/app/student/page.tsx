'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EinsteinMentor } from '@/components/brand/einstein-mentor';
import { PageShell } from '@/components/base/page-shell';
import { authService } from '@/services/auth.service';
import { questionService } from '@/services/question.service';
import { reportService } from '@/services/report.service';
import { wrongbookService } from '@/services/wrongbook.service';
import { useUserStore } from '@/store/use-user-store';
import type { QuestionItem, ReportOverviewResult, WrongQuestionItem } from '@/types/api';

type HomeTask = {
  title: string;
  description: string;
  href: string;
  badge: string;
  tone: string;
};

function getNextStepLabel(
  report: ReportOverviewResult | null,
  wrongQuestions: WrongQuestionItem[],
) {
  if (wrongQuestions.length > 0) {
    return '先回顾最近错题，再进入下一轮练习，会更容易进步。';
  }

  if ((report?.accuracyRate ?? 0) < 75) {
    return '先做一轮基础练习，再让 AI 帮你讲清楚不会的题。';
  }

  return '今天状态不错，继续练习一轮，争取把星星再点亮一点。';
}

function buildTasks(
  report: ReportOverviewResult | null,
  wrongQuestions: WrongQuestionItem[],
  recentQuestions: QuestionItem[],
): HomeTask[] {
  return [
    {
      title: '继续今天的练习',
      description:
        recentQuestions.length > 0
          ? `当前有 ${recentQuestions.length} 道推荐题等你挑战。`
          : '去数学地图里挑一关开始今天的练习。',
      href: '/student/practice',
      badge: '主任务',
      tone: 'bg-[linear-gradient(180deg,#EEF1FF,#FFFFFF)]',
    },
    {
      title: '复习最近错题',
      description:
        wrongQuestions.length > 0
          ? `有 ${wrongQuestions.length} 道错题待巩固。`
          : '今天还没有新的错题，继续保持。',
      href: '/student/wrongbook',
      badge: '复习',
      tone: 'bg-[linear-gradient(180deg,#FFF8E1,#FFFFFF)]',
    },
    {
      title: '问爱因导师',
      description:
        (report?.aiQaCount ?? 0) > 0
          ? `你已经问过 ${report?.aiQaCount ?? 0} 次 AI，可以继续提问。`
          : '遇到不会的题，马上让 AI 老师一步步讲给你听。',
      href: '/student/ai-qa',
      badge: 'AI',
      tone: 'bg-[linear-gradient(180deg,#F3E8FF,#FFFFFF)]',
    },
  ];
}

function buildRecentSummary(report: ReportOverviewResult | null) {
  const latest = report?.learningTrend?.at(-1);
  if (!latest) {
    return '今天还没有新的完整学习记录，先开始一轮练习，数学地图就会亮起来。';
  }

  return `最近一次练习完成了 ${latest.totalQuestions ?? 0} 题，正确率 ${latest.accuracyRate}% 。继续保持，今天也能更进一步。`;
}

export default function StudentHomePage() {
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const setSession = useUserStore((state) => state.setSession);
  const accessToken = useUserStore((state) => state.accessToken);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<ReportOverviewResult | null>(null);
  const [recentQuestions, setRecentQuestions] = useState<QuestionItem[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestionItem[]>([]);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const loadStudentHomeData = async () => {
      if (!accessToken) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const resolvedUser = currentUser ?? (await authService.getCurrentUser());

        if (!currentUser) {
          setSession(accessToken, resolvedUser);
        }

        const grade = resolvedUser.grade ?? resolvedUser.student?.grade ?? 3;

        const [reportData, wrongbookData, questionData] = await Promise.all([
          reportService.getOverview(7),
          wrongbookService.getList({ grade, unresolvedOnly: true }),
          questionService.getQuestionList({ grade }),
        ]);

        setReport(reportData);
        setWrongQuestions(wrongbookData.list);
        setRecentQuestions(questionData.list);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '学生首页数据加载失败，请稍后重试。');
      } finally {
        setLoading(false);
      }
    };

    void loadStudentHomeData();
  }, [accessToken, currentUser, setSession]);

  const displayName = currentUser?.displayName ?? '数学小队员';
  const grade = currentUser?.grade ?? currentUser?.student?.grade ?? 3;
  const recentSummary = useMemo(() => buildRecentSummary(report), [report]);
  const nextStepLabel = useMemo(
    () => getNextStepLabel(report, wrongQuestions),
    [report, wrongQuestions],
  );
  const tasks = useMemo(
    () => buildTasks(report, wrongQuestions, recentQuestions),
    [report, wrongQuestions, recentQuestions],
  );

  return (
    <PageShell
      title="学生学习中心"
      description="这里是你的数学学习中心首页。你可以从今天任务开始，继续练习、提问 AI、复习错题，再回来看见自己的进步。"
    >
      {error ? (
        <div className="mb-6 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="math-card math-panel relative rounded-[2.2rem] bg-[linear-gradient(135deg,rgba(238,241,255,0.96),rgba(255,255,255,0.94),rgba(232,245,233,0.92))] px-6 py-7">
          <div className="pointer-events-none absolute -left-10 top-12 h-28 w-28 rounded-full bg-[#3F51B5]/10 blur-3xl" />
          <div className="pointer-events-none absolute right-8 top-8 text-5xl font-black text-brand-100">+</div>
          <div className="pointer-events-none absolute right-20 bottom-10 text-4xl font-black text-[#FFD54F]">π</div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="math-chip math-chip-primary">{grade} 年级学习中心</span>
                <span className="math-chip math-chip-success">今日学习入口</span>
                <span className="math-chip math-chip-warm">陪伴式数学学习</span>
              </div>
              <h2 className="font-math-display text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
                {displayName}，今天从哪里开始学数学？
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">{recentSummary}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/student/practice"
                  className="math-button-primary rounded-[1.1rem] px-6 py-4 text-base font-extrabold text-white"
                >
                  继续练习
                </Link>
                <Link
                  href="/student/ai-qa"
                  className="math-button-secondary rounded-[1.1rem] px-6 py-4 text-base font-extrabold text-slate-700"
                >
                  去问 AI
                </Link>
              </div>
            </div>

            <div className="min-w-[18rem] rounded-[1.8rem] bg-[linear-gradient(180deg,#F8FBFF,#EEF4FF)] p-4 shadow-[0_18px_32px_rgba(63,81,181,0.12)]">
              <div className="flex items-center gap-3">
                <EinsteinMentor size="md" mood="celebrate" badge="陪学中" />
                <div>
                  <p className="font-math-display text-2xl font-extrabold text-ink">爱因导师建议</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{nextStepLabel}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>今日学习能量</span>
                  <span>{Math.min((report?.totalQuestions ?? 0) * 5, 100)} / 100</span>
                </div>
                <div className="math-progress-track h-3">
                  <div
                    className="math-progress-fill h-full"
                    style={{ width: `${Math.min((report?.totalQuestions ?? 0) * 5, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="math-stat-card px-4 py-5">
              <p className="text-sm font-semibold text-slate-500">学习进度</p>
              <p className="mt-2 font-math-display text-3xl font-extrabold text-brand-700">
                {report?.totalQuestions ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">累计去重题目</p>
            </article>
            <article className="math-stat-card px-4 py-5">
              <p className="text-sm font-semibold text-slate-500">正确率</p>
              <p className="mt-2 font-math-display text-3xl font-extrabold text-[#2E7D32]">
                {report?.accuracyRate ?? 0}%
              </p>
              <p className="mt-1 text-xs text-slate-500">最近学习表现</p>
            </article>
            <article className="math-stat-card px-4 py-5">
              <p className="text-sm font-semibold text-slate-500">AI 使用次数</p>
              <p className="mt-2 font-math-display text-3xl font-extrabold text-[#8E24AA]">
                {report?.aiQaCount ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">有问题就问导师</p>
            </article>
            <article className="math-stat-card px-4 py-5">
              <p className="text-sm font-semibold text-slate-500">最近错题</p>
              <p className="mt-2 font-math-display text-3xl font-extrabold text-[#EF6C00]">
                {wrongQuestions.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">待复习题目</p>
            </article>
          </div>
        </article>

        <article className="math-card rounded-[2.2rem] px-6 py-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">成长激励</p>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">今天的成长能量</h2>
            </div>
            <span className="math-chip math-chip-violet">轻游戏化</span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="math-stat-card bg-[#FFF8E1] px-4 py-5 text-center">
              <p className="text-sm text-amber-700">成长星星</p>
              <p className="mt-2 font-math-display text-3xl font-extrabold text-[#EF6C00]">
                {report?.correctCount ?? 0}
              </p>
            </div>
            <div className="math-stat-card bg-[#E8F5E9] px-4 py-5 text-center">
              <p className="text-sm text-emerald-700">连续学习</p>
              <p className="mt-2 font-math-display text-3xl font-extrabold text-[#2E7D32]">
                {report?.learningTrend.length ?? 0}
              </p>
            </div>
            <div className="math-stat-card bg-[#EEF1FF] px-4 py-5 text-center">
              <p className="text-sm text-brand-700">今日建议</p>
              <p className="mt-2 font-math-display text-2xl font-extrabold text-brand-700">
                先练习
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.6rem] bg-[linear-gradient(180deg,#EEF4FF,#FFFFFF)] px-5 py-5">
            <p className="font-math-display text-2xl font-extrabold text-ink">小提醒</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              先完成一轮练习，再回来看错题和学习报告，今天的学习路径会更清晰。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/student/practice"
                className="math-button-primary inline-flex rounded-[1rem] px-4 py-3 text-sm font-extrabold text-white"
              >
                从练习开始
              </Link>
              <Link
                href="/student/wrongbook"
                className="math-button-secondary inline-flex rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700"
              >
                去复习错题
              </Link>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="math-card rounded-[2rem] px-6 py-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">今日任务</p>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">今天先做这三件事</h2>
            </div>
            <span className="math-chip math-chip-success">任务卡</span>
          </div>

          <div className="mt-5 space-y-4">
            {tasks.map((task, index) => (
              <Link
                key={task.title}
                href={task.href}
                className={`math-lift block rounded-[1.6rem] border border-white/80 ${task.tone} px-5 py-5 shadow-[0_16px_30px_rgba(63,81,181,0.08)]`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-brand-700">
                        {index + 1}
                      </span>
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-slate-700">
                        {task.badge}
                      </span>
                    </div>
                    <p className="font-math-display text-2xl font-extrabold text-ink">{task.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{task.description}</p>
                  </div>
                  <span className="text-xl font-black text-brand-700">→</span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">功能入口</p>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">继续从这里开始</h2>
            </div>
            <span className="math-chip math-chip-primary">清晰入口</span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Link
              href="/student/practice"
              className="math-lift rounded-[1.6rem] bg-[#EEF1FF] px-5 py-5 shadow-[0_16px_30px_rgba(63,81,181,0.08)]"
            >
              <p className="font-math-display text-2xl font-extrabold text-ink">继续练习</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">进入数学地图，继续今天的练题任务。</p>
            </Link>
            <Link
              href="/student/ai-qa"
              className="math-lift rounded-[1.6rem] bg-[#F3E8FF] px-5 py-5 shadow-[0_16px_30px_rgba(63,81,181,0.08)]"
            >
              <p className="font-math-display text-2xl font-extrabold text-ink">AI答疑</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">把不会的题交给爱因导师一步步讲清楚。</p>
            </Link>
            <Link
              href="/student/wrongbook"
              className="math-lift rounded-[1.6rem] bg-[#FFF3E0] px-5 py-5 shadow-[0_16px_30px_rgba(63,81,181,0.08)]"
            >
              <p className="font-math-display text-2xl font-extrabold text-ink">最近错题</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">回到错题诊所，把薄弱点补起来。</p>
            </Link>
            <Link
              href="/student/reports"
              className="math-lift rounded-[1.6rem] bg-[#E8F5E9] px-5 py-5 shadow-[0_16px_30px_rgba(63,81,181,0.08)]"
            >
              <p className="font-math-display text-2xl font-extrabold text-ink">学习报告</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">看看最近在数学上进步了多少。</p>
            </Link>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="math-card rounded-[2rem] px-6 py-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">最近错题</p>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">优先复习这些题</h2>
            </div>
            <Link
              href="/student/wrongbook"
              className="math-button-secondary rounded-[1rem] px-4 py-2 text-sm font-extrabold text-slate-700"
            >
              查看全部
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">正在整理错题...</p>
            ) : wrongQuestions.slice(0, 3).length === 0 ? (
              <p className="text-sm leading-6 text-slate-500">最近没有新的错题，继续保持。</p>
            ) : (
              wrongQuestions.slice(0, 3).map((item) => (
                <article key={item.id} className="rounded-[1.4rem] bg-[#FFF9E8] px-4 py-4">
                  <p className="font-semibold text-ink">{item.questionTitle}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.questionStem}</p>
                  <p className="mt-2 text-xs font-black text-[#EF6C00]">已错 {item.wrongCount} 次</p>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">最近练习</p>
              <h2 className="font-math-display text-3xl font-extrabold text-ink">从这些推荐题继续</h2>
            </div>
            <Link
              href="/student/practice"
              className="math-button-secondary rounded-[1rem] px-4 py-2 text-sm font-extrabold text-slate-700"
            >
              去练习
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">正在整理题目...</p>
            ) : recentQuestions.slice(0, 3).length === 0 ? (
              <p className="text-sm leading-6 text-slate-500">当前还没有推荐题目。</p>
            ) : (
              recentQuestions.slice(0, 3).map((question) => (
                <article key={question.id} className="rounded-[1.4rem] bg-[#EEF4FF] px-4 py-4">
                  <p className="font-semibold text-ink">{question.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{question.stem}</p>
                  <p className="mt-2 text-xs font-black text-brand-700">
                    {question.grade} 年级 · 难度 {question.difficulty}
                  </p>
                </article>
              ))
            )}
          </div>
        </article>
      </section>
    </PageShell>
  );
}
