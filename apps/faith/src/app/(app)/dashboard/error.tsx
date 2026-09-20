"use client";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const isConnError =
      error.message?.includes("fetch failed") ||
      error.message?.includes("ETIMEDOUT") ||
      error.message?.includes("NeonDb");
    if (isConnError) {
      const t = setTimeout(reset, 2000);
      return () => clearTimeout(t);
    }
  }, [error, reset]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center animate-fade-in">
      <div className="w-10 h-10 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
      <p className="text-zinc-400 text-sm">Connecting to database…</p>
      <p className="text-zinc-600 text-xs">Neon is waking up, retrying automatically</p>
      <button
        onClick={reset}
        className="btn-ghost text-xs mt-2"
      >
        Retry now
      </button>
    </div>
  );
}