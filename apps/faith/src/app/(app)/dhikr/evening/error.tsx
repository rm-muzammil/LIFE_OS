"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    if (error.message?.includes("fetch failed") || error.message?.includes("ETIMEDOUT")) {
      const t = setTimeout(reset, 2000);
      return () => clearTimeout(t);
    }
  }, [error, reset]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
      <p className="text-zinc-500 text-sm">Connecting…</p>
      <button onClick={reset} className="btn-ghost text-xs">Retry now</button>
    </div>
  );
}