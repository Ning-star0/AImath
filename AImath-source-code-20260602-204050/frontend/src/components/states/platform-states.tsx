'use client';

import { useRouter } from 'next/navigation';
import { PlatformStateCard } from '@/components/states/platform-state-card';

export function AuthRequiredState() {
  return (
    <PlatformStateCard
      eyebrow="请先登录"
      title="请先登录账号"
      description="登录后可继续查看学习任务、练习记录、错题本和学习报告。"
      icon="登"
      tone="blue"
      primaryAction={{ label: '立即登录', href: '/login' }}
      secondaryAction={{ label: '返回首页', href: '/' }}
    />
  );
}

export function SessionExpiredState() {
  return (
    <PlatformStateCard
      eyebrow="登录状态失效"
      title="登录状态已失效"
      description="为了保护账号安全，请重新登录后继续使用平台服务。"
      icon="时"
      tone="amber"
      primaryAction={{ label: '重新登录', href: '/login' }}
      secondaryAction={{ label: '返回首页', href: '/' }}
    />
  );
}

export function PermissionDeniedState() {
  return (
    <PlatformStateCard
      eyebrow="权限不足"
      title="当前无法访问此页面"
      description="你的账号暂时没有访问该功能的权限，请确认当前身份或联系管理员处理。"
      icon="权"
      tone="red"
      primaryAction={{ label: '返回首页', href: '/' }}
      secondaryAction={{ label: '联系管理员', href: 'mailto:support@einmath.cn' }}
    />
  );
}

export function NoLearningDataState() {
  return (
    <PlatformStateCard
      eyebrow="暂无学习数据"
      title="暂时还没有学习数据"
      description="完成练习或学习任务后，这里会自动更新你的学习进度和相关记录。"
      icon="学"
      tone="blue"
      primaryAction={{ label: '开始练习', href: '/student/practice' }}
      secondaryAction={{ label: '返回学习中心', href: '/student' }}
    />
  );
}

export function NoWrongQuestionsState() {
  return (
    <PlatformStateCard
      eyebrow="无需复习"
      title="当前没有待复习错题"
      description="继续保持认真练习。新的错题会在需要复习时自动加入错题本。"
      icon="对"
      tone="green"
      primaryAction={{ label: '继续练习', href: '/student/practice' }}
      secondaryAction={{ label: '查看学习报告', href: '/student/reports' }}
    />
  );
}

export function NoReportState() {
  return (
    <PlatformStateCard
      eyebrow="报告待生成"
      title="暂时还没有学习报告"
      description="完成一段时间的练习后，系统会根据学习情况生成你的成长报告和学习建议。"
      icon="报"
      tone="blue"
      primaryAction={{ label: '去完成练习', href: '/student/practice' }}
      secondaryAction={{ label: '返回学习中心', href: '/student' }}
    />
  );
}

export function TeacherPendingReviewState() {
  return (
    <PlatformStateCard
      eyebrow="教师审核中"
      title="教师账号审核中"
      description="你的教师申请已经提交成功，审核通过后即可进入教师工作台查看班级与学情信息。"
      icon="审"
      tone="amber"
      primaryAction={{ label: '查看审核说明', href: '/login' }}
      secondaryAction={{ label: '返回登录页', href: '/login' }}
    />
  );
}

export function PageLoadErrorState() {
  const router = useRouter();

  return (
    <PlatformStateCard
      eyebrow="加载失败"
      title="页面暂时无法打开"
      description="当前内容加载失败，请稍后刷新页面或返回上一页继续使用其他功能。"
      icon="页"
      tone="red"
      primaryAction={{ label: '重新加载', onClick: () => router.refresh() }}
      secondaryAction={{ label: '返回首页', href: '/' }}
    />
  );
}

export function NetworkErrorState() {
  const router = useRouter();

  return (
    <PlatformStateCard
      eyebrow="网络异常"
      title="网络连接异常"
      description="当前网络不稳定，部分内容可能暂时无法加载。请检查网络后再次尝试。"
      icon="网"
      tone="amber"
      primaryAction={{ label: '重新尝试', onClick: () => router.refresh() }}
      secondaryAction={{ label: '稍后再试' }}
    />
  );
}

export function MaintenanceState() {
  return (
    <PlatformStateCard
      eyebrow="系统维护"
      title="平台正在维护中"
      description="为了提供更稳定的学习服务，平台正在进行维护。请稍后再访问。"
      icon="维"
      tone="slate"
      primaryAction={{ label: '刷新页面', href: '/' }}
      secondaryAction={{ label: '返回首页', href: '/' }}
    />
  );
}
