"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Grid3X3,
  LayoutDashboard,
  Moon,
  Settings,
  Sparkles,

} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/quran", label: "Quran", icon: BookOpen },
  { href: "/dhikr", label: "Dhikr", icon: Sparkles },
  { href: "/raku", label: "Raku", icon: Grid3X3 },
  { href: "/vocab", label: "Vocab", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-zinc-900 border-r border-zinc-800 p-4 gap-1">
        <div className="flex items-center gap-2.5 px-3 py-3 mb-4">
          <Moon className="w-5 h-5 text-brand-400" strokeWidth={1.5} />
          <span className="font-semibold text-sm tracking-wide text-zinc-100">
            Faith Tracker
          </span>
        </div>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                active
                  ? "bg-brand-500/15 text-brand-400 border border-brand-500/25"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-4">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 px-2 py-1 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn("nav-item", active && "active")}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
