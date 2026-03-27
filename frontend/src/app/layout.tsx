import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '小学数学智能辅导系统',
  description: '面向小学 1-6 年级学生的数学智能辅导系统 MVP',
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

