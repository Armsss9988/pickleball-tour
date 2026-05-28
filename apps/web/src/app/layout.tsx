import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'GOLAB Tournament Platform',
    template: '%s | GOLAB',
  },
  description:
    'Hệ thống quản lý giải đấu Pickleball đội nhóm — Thể thức Tiếp sức Đoàn kết',
  keywords: ['pickleball', 'tournament', 'giải đấu', 'tiếp sức', 'GOLAB'],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${inter.variable} ${spaceGrotesk.variable}`} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
