import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '老年综合评估系统 · 登录',
  description: '登录表单前端校验演示',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
