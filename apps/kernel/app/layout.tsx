import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import Providers from '@/components/SessionProvider';

export const metadata: Metadata = {
  title: 'Self-Khilafah',
  description: 'Life governance kernel',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Self-Khilafah',
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 pb-20 md:pb-0 min-w-0">
              <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8">{children}</div>
            </main>
          </div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
