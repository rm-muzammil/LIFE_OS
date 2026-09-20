"use client";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { NumberInput } from "@/components/ui/NumberInput";

interface Props {
  fields: {
    morningAdhkar: boolean;
    eveningAdhkar: boolean;
    beforeSleepAdhkar: boolean;
    duaMinutes: number;
    laIlaha: boolean;
    subhanallahi: boolean;
  };
  set: (key: any, value: any) => void;
}

function AdhkarLinkRow({
  label, sublabel, done, href, pts,
}: {
  label: string;
  sublabel: string;
  done: boolean;
  href: string;
  pts: number;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={cn(
        "flex items-center justify-between w-full px-3 py-2.5 rounded-xl border transition-all duration-200 active:scale-[0.98]",
        done
          ? "bg-brand-500/15 border-brand-500/40 text-brand-400"
          : "bg-zinc-800/60 border-zinc-700/50 text-zinc-300"
      )}
    >
      <div className="flex items-center gap-3">
        {done
          ? <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
          : <Circle className="w-4 h-4 text-zinc-600 shrink-0" />}
        <div className="text-left">
          <p className="text-sm font-medium leading-none">{label}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5 leading-none">{sublabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-600 font-mono">{pts}pt</span>
        <ArrowRight className="w-4 h-4 text-zinc-500" />
      </div>
    </button>
  );
}

export function DhikrSection({ fields, set }: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="section-title mb-0">Dhikr</p>
        <span className="text-xs font-mono text-zinc-500">25pts</span>
      </div>
      <div className="space-y-2">
        <AdhkarLinkRow
          label="Morning Adhkar"
          sublabel={fields.morningAdhkar ? "All done ✓" : "Tap to open — أذكار الصباح"}
          done={fields.morningAdhkar}
          href="/dhikr/morning"
          pts={5}
        />
        <AdhkarLinkRow
          label="Evening Adhkar"
          sublabel={fields.eveningAdhkar ? "All done ✓" : "Tap to open — أذكار المساء"}
          done={fields.eveningAdhkar}
          href="/dhikr/evening"
          pts={5}
        />
        <AdhkarLinkRow
          label="Before Sleep Adhkar"
          sublabel={fields.beforeSleepAdhkar ? "All done ✓" : "Tap to open — أذكار النوم"}
          done={fields.beforeSleepAdhkar}
          href="/dhikr/sleep"
          pts={5}
        />
        <NumberInput
          label="Dua"
          sublabel="Any duration = full points"
          value={fields.duaMinutes}
          onChange={(v) => set("duaMinutes", v)}
          unit="min"
          pts={3}
        />
      </div>
      <p className="text-[10px] text-zinc-700 mt-3 leading-relaxed">
        Adhkar completion syncs automatically from the Dhikr tab.
      </p>
    </div>
  );
}