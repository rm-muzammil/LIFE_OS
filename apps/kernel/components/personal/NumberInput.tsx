export default function NumberInput({
  value,
  onChange,
  label,
  points,
  unit,
  min = 0,
  max,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  points?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-zinc-300">{label}</span>
        {points && <span className="mt-0.5 block text-xs text-zinc-500">{points}</span>}
      </span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          value={value || ''}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-24 rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-right text-sm text-zinc-100 focus:border-brand-500 focus:outline-none"
        />
        {unit && <span className="text-sm text-zinc-500">{unit}</span>}
      </span>
    </label>
  );
}
