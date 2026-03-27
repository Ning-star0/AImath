'use client';

import { useEffect, useMemo, useState } from 'react';
import { DailyTasks } from '@/components/student-home/daily-tasks';
import { LearningOverview } from '@/components/student-home/learning-overview';
import { LearningCompanion } from '@/components/student-home/learning-companion';
import { QuickActions } from '@/components/student-home/quick-actions';
import { RecentLearning } from '@/components/student-home/recent-learning';
import { WelcomeHero } from '@/components/student-home/welcome-hero';
import { PageShell } from '@/components/base/page-shell';
import { authService } from '@/services/auth.service';
import {
  getLevelTitle,
  getRewardProgress,
  markLearningActive,
  readRewardState,
} from '@/lib/game-rewards';
import { questionService } from '@/services/question.service';
import { reportService } from '@/services/report.service';
import { wrongbookService } from '@/services/wrongbook.service';
import { useUserStore } from '@/store/use-user-store';
import type { QuestionItem, ReportOverviewResult, WrongQuestionItem } from '@/types/api';

function buildRecentLearningText(report: ReportOverviewResult | null) {
  const latest = report?.learningTrend?.at(-1);
  if (!latest) {
    return '最近还没有完整记录，先做几道题，今天就会留下新的学习小脚印。';
  }

  const total = latest.totalQuestions ?? latest.practiceCount ?? 0;
  return `最近一次学习做了 ${total} 道题，正确率是 ${latest.accuracyRate}%。`;
}

function buildRecentPractice(questions: QuestionItem[]) {
  return questions.slice(0, 3).map((question) => ({
    title: question.title,
    meta: `${question.grade} 年级 · 难度 ${question.difficulty} · ${question.questionType}`,
  }));
}

function buildRecentWrongQuestions(items: WrongQuestionItem[]) {
  if (items.length === 0) {
    return [
      {
        title: '最近没有新的错题',
        meta: '继续保持，做完练习后也可以回来看看有没有需要复习的地方。',
      },
    ];
  }

  return items.slice(0, 3).map((item) => ({
    title: item.questionTitle,
    meta: `已错 ${item.wrongCount} 次 · ${item.knowledgePoint?.name ?? '基础复习'}`,
  }));
}

function buildRecentAiQuestions(report: ReportOverviewResult | null) {
  const aiCount = report?.aiQaCount ?? 0;

  if (aiCount === 0) {
    return [
      {
        title: '最近还没有问过 AI 老师',
        meta: '遇到不会的题时，可以直接去 AI 答疑页问一问。',
      },
    ];
  }

  return [
    {
      title: `最近已经问了 AI 老师 ${aiCount} 次`,
      meta: '先做题，再把不会的题拿来一步一步问清楚，会更有用。',
    },
    {
      title: '优先提问今天练习里不会的题',
      meta: '这样更容易把容易出错的知识点补起来。',
    },
  ];
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
  const [rewardState, setRewardState] = useState({
    totalStars: 0,
    streakDays: 0,
  });

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
        const resolvedUser =
          currentUser ?? (await authService.getCurrentUser());

        if (!currentUser) {
          setSession(accessToken, resolvedUser);
        }

        const nextRewardState = markLearningActive(resolvedUser.id);
        setRewardState({
          totalStars: nextRewardState.totalStars,
          streakDays: nextRewardState.streakDays,
        });

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
        setError(
          loadError instanceof Error
            ? loadError.message
            : '学生首页数据加载失败，请稍后重试。',
        );
      } finally {
        setLoading(false);
      }
    };

    void loadStudentHomeData();
  }, [accessToken, currentUser, setSession]);

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

  const recentLearningText = useMemo(
    () => buildRecentLearningText(report),
    [report],
  );
  const displayName = currentUser?.displayName ?? '小同学';
  const rewardProgress = getRewardProgress(rewardState.totalStars);
  const levelTitle = getLevelTitle(rewardProgress.level);

  return (
    <PageShell
      title="学生首页"
      description="这里像一张今天的学习地图。跟着任务走一走，你会看到自己一点点进步。"
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <WelcomeHero user={currentUser} />

        <LearningCompanion
          displayName={displayName}
          levelTitle={levelTitle.title}
          streakDays={rewardState.streakDays}
          totalStars={rewardState.totalStars}
        />

        <DailyTasks user={currentUser} />

        <QuickActions />

        <LearningOverview
          totalQuestions={report?.totalQuestions ?? 0}
          accuracyRate={report?.accuracyRate ?? 0}
          wrongCount={report?.wrongCount ?? wrongQuestions.length}
          totalStars={rewardState.totalStars}
          streakDays={rewardState.streakDays}
          recentLearningText={
            loading ? '正在整理最近的学习数据...' : recentLearningText
          }
        />

        <RecentLearning
          recentPractice={buildRecentPractice(recentQuestions)}
          recentWrongQuestions={buildRecentWrongQuestions(wrongQuestions)}
          recentAiQuestions={buildRecentAiQuestions(report)}
        />
      </div>
    </PageShell>
  );
}
