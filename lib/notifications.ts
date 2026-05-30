// Notification utility — Phase 1 sets up the infrastructure.
// Actual scheduling (prayer times, Kahf reminder) wired in Phase 2+.

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return await Notification.requestPermission()
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function notificationPermission(): NotificationPermission | null {
  if (typeof window === 'undefined') return null
  if (!('Notification' in window)) return null
  return Notification.permission
}

// Send an immediate local notification (no server needed)
export async function sendLocalNotification(title: string, body: string, icon = '/icons/icon-192.png') {
  const perm = await requestNotificationPermission()
  if (perm !== 'granted') return

  const reg = await navigator.serviceWorker.ready
  reg.showNotification(title, {
    body,
    icon,
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    tag: title, // prevent duplicates
  } as NotificationOptions & { vibrate: number[] })
}

// ── Planned notification types (wired in Phase 2+) ──────────────────────────
//
// DAILY IBADAH REMINDERS (scheduled via service worker)
//   - Fajr: configurable time, "Time for Fajr — start the day with Allah"
//   - Dhuhr, Asr, Maghrib, Isha: user-set times
//   - Surah Mulk: nightly before bed, "Don't sleep without Surah Al-Mulk"
//
// FRIDAY SPECIAL
//   - Friday morning: "Jumu'ah Mubarak — read Surah Al-Kahf today"
//
// RAKU STREAK GUARD (Phase 2)
//   - If no raku session logged by noon: "Continue your raku — Dr Israr awaits"
//
// VERSE MEMORIZATION (Phase 2)
//   - Morning reminder: "Today's verse — [verse text]"
//
// Usage example (call from a settings page):
//   await sendLocalNotification('Salah Time', 'Time for Dhuhr prayer')