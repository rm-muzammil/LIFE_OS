"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface Props {
  today: string;
  initialCounts: Record<string, { count: number; completed: boolean }>;
}

export function CounterPageClient({ today, initialCounts }: Props) {
  const router = useRouter();
  const [counts, setCounts] = useState(initialCounts);

  function onUpdate(key: string, count: number, completed: boolean) {
    setCounts((prev) => ({ ...prev, [key]: { count, completed } }));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dhikr")}
          className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-300" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Daily Counters</h1>
          <p className="text-xs text-zinc-500">العداد اليومي</p>
        </div>
      </div>


    </div>
  );
}