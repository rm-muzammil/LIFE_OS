// app/quran/layout.tsx
export default function QuranLayout({ children }: { children: React.ReactNode }) {
  return (
    // Extra bottom padding on mobile to clear both the sub-nav + main nav
    <div className="pb-12 md:pb-0">
      {children}
    </div>
  )
}