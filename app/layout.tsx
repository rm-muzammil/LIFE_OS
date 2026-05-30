import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Sidebar } from '@/components/ui/Sidebar'
import { MobileNav } from '@/components/ui/MobileNav'
import { MobileHeader } from '@/components/ui/MobileHeader'
import { InstallPrompt } from '@/components/ui/InstallPrompt'

export const metadata: Metadata = {
  title: 'Self-Khilafah',
  description: 'Life governance dashboard — faith, mission, accountability',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Self-Khilafah',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Amiri:ital@0;1&display=swap"
          rel="stylesheet"
        />
        {/* iOS PWA splash / status bar */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile top header */}
        <div className="md:hidden">
          <MobileHeader />
        </div>

        {/* Main content — shifts right on desktop, full width on mobile */}
        <main className="md:ml-64 min-h-screen">
          {/* Safe area padding: top for mobile status bar, bottom for mobile nav */}
          <div className="px-4 pt-4 pb-24 md:px-8 md:pt-8 md:pb-8 max-w-4xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav — hidden on desktop */}
        <div className="md:hidden">
          <MobileNav />
        </div>

        {/* PWA install prompt */}
        <InstallPrompt />
      </body>
    </html>
  )
}
