import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '爱因数学星球',
  description:
    '面向小学 1-6 年级学生的数学智能学习平台，覆盖练习、AI讲题、错题本、学习报告、教师查看与管理后台。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
