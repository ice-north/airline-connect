import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AIRLINE MGMT | ダイヤ運航',
  description: '日本の地方空港を舞台にした航空経営＆ダイヤシミュレーションのプロトタイプ。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body className={`${geist.variable} antialiased`}>{children}</body></html>;
}
