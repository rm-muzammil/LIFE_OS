import { Amiri } from 'next/font/google';

const amiri = Amiri({
  weight: ['400', '700'],
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-amiri',
});

export default function FaithLayout({ children }: { children: React.ReactNode }) {
  return <div className={`faith-app ${amiri.variable}`}>{children}</div>;
}
