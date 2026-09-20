"use client";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { NumberInput } from "@/components/ui/NumberInput";
import { StarRating } from "@/components/ui/StarRating";

interface Props {
  fields: {
    quranPages: number; tadabburMinutes: number; tafseerDone: boolean;
    tajweedConfidence: number; verseDone: boolean; islamicStudyMinutes: number;
  };
  set: (key: any, value: any) => void;
}

export function QuranSection({ fields, set }: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="section-title mb-0">Quran Learning</p>
        <span className="text-xs font-mono text-zinc-500">15pts</span>
      </div>
      <div className="space-y-2">
        <NumberInput label="Pages Read" sublabel="≥1 page = full points" value={fields.quranPages} onChange={(v) => set("quranPages", v)} unit="pages" pts={3} />
        <NumberInput label="Tadabbur / Reflection" sublabel="≥5 min = full points" value={fields.tadabburMinutes} onChange={(v) => set("tadabburMinutes", v)} unit="min" pts={2} />
        <ToggleRow label="Tafseer — Dr Israr" sublabel="Raku-by-raku study" checked={fields.tafseerDone} onChange={(v) => set("tafseerDone", v)} pts={4} />
        <StarRating label="Tajweed Confidence" sublabel="1–5 rating" value={fields.tajweedConfidence} max={5} onChange={(v) => set("tajweedConfidence", v)} pts={3} />
        <ToggleRow label="Daily Verse Memorized" sublabel="Juz 30 back→front" checked={fields.verseDone} onChange={(v) => set("verseDone", v)} pts={2} />
        <NumberInput label="Islamic Study" sublabel="≥15 min = full point" value={fields.islamicStudyMinutes} onChange={(v) => set("islamicStudyMinutes", v)} unit="min" pts={1} />
      </div>
    </div>
  );
}