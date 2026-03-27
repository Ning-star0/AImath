'use client';

import { PageShell } from '@/components/base/page-shell';
import { HomeHero } from '@/components/home/home-hero';
import { HomeLearningOverview } from '@/components/home/home-learning-overview';

export default function HomePage() {
  return (
    <PageShell
      title="小学数学智能辅导系统"
      description="用清晰、友好的方式陪学生练习、答疑、复习和查看学习进步。"
      showPageIntro={false}
      navItems={[
        { href: '/', label: '首页' },
        { href: '/student/practice', label: '练习' },
        { href: '/student/ai-qa', label: 'AI 答疑' },
        { href: '/student/wrongbook', label: '错题本' },
        { href: '/student/reports', label: '学习报告' },
      ]}
    >
      <HomeHero />
      <HomeLearningOverview />
    </PageShell>
  );
}
