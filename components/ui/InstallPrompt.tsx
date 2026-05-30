'use client'
import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [prompt, setPrompt]     = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    // Check dismissed state
    if (localStorage.getItem('pwa-dismissed') === 'true') {
      setDismissed(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt || dismissed || installed) return null

  const handleInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa-dismissed', 'true')
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50
                    bg-zinc-800 border border-zinc-700 rounded-2xl p-4 shadow-2xl
                    animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-900/50 border border-brand-800 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100">Install Self-Khilafah</p>
          <p className="text-xs text-zinc-500 mt-0.5">Add to home screen for offline access</p>
        </div>
        <button onClick={handleDismiss} className="text-zinc-600 hover:text-zinc-400 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={handleInstall} className="btn-primary flex-1 text-sm py-2">
          Install
        </button>
        <button onClick={handleDismiss} className="btn-ghost text-sm py-2 px-4">
          Not now
        </button>
      </div>
    </div>
  )
}
