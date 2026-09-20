"use client";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { StarRating } from "@/components/ui/StarRating";

interface Props {
  fields: { gazeLowered: number; haramFree: boolean };
  set: (key: any, value: any) => void;
}

export function DisciplineSection({ fields, set }: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="section-title mb-0">Self-Discipline</p>
        <span className="text-xs font-mono text-zinc-500">5pts</span>
      </div>
      <div className="space-y-2">
        <StarRating label="Lowered Gaze" sublabel="1 = poor · 5 = excellent" value={fields.gazeLowered} max={5} onChange={(v) => set("gazeLowered", v)} pts={3} />
        <ToggleRow label="Avoided Haram Content" sublabel="No haram media / content today" checked={fields.haramFree} onChange={(v) => set("haramFree", v)} pts={2} />
      </div>
    </div>
  );
}