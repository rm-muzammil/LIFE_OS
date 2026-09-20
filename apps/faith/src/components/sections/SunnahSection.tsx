"use client";
import { ToggleRow } from "@/components/ui/ToggleRow";

interface Props {
  fields: { surahMulk: boolean; surahKahf: boolean };
  set: (key: any, value: any) => void;
  isFriday: boolean;
}

export function SunnahSection({ fields, set, isFriday }: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="section-title mb-0">Sunnah Recitations</p>
        <span className="text-xs font-mono text-zinc-500">10pts</span>
      </div>
      <div className="space-y-2">
        <ToggleRow label="Surah Al-Mulk" sublabel="سورة الملك — nightly recitation" checked={fields.surahMulk} onChange={(v) => set("surahMulk", v)} pts={10} />
        {isFriday && (
          <ToggleRow label="Surah Al-Kahf" sublabel="سورة الكهف — Friday bonus +5pts" checked={fields.surahKahf} onChange={(v) => set("surahKahf", v)} pts={5} />
        )}
        {!isFriday && <p className="text-xs text-zinc-600 px-1 pt-1">Surah Al-Kahf bonus unlocks on Fridays.</p>}
      </div>
    </div>
  );
}