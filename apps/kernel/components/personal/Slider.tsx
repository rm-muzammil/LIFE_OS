export default function Slider({
  value,
  onChange,
  min = 1,
  max = 5,
  step = 1,
  label,
  points,
  display,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  points?: string;
  display?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between text-sm">
        <span className="font-medium text-zinc-300">{label}</span>
        <span className="flex items-center gap-2">
          {points && <span className="text-xs text-zinc-500">{points}</span>}
          <span className="w-12 text-right font-semibold text-brand-300">{display ?? value}</span>
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-brand-500"
      />
      <span className="flex justify-between text-xs text-zinc-600">
        <span>{min}</span>
        <span>{max}</span>
      </span>
    </label>
  );
}
