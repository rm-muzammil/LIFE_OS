export default function Toggle({
  value,
  onChange,
  label,
  points,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  points?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
        value
          ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
      }`}
    >
      <span>{label}</span>
      <span className="flex items-center gap-3">
        {points && <span className="text-xs text-zinc-500">{points}</span>}
        <span className={`relative h-5 w-10 rounded-full ${value ? 'bg-brand-500' : 'bg-zinc-700'}`}>
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              value ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </span>
      </span>
    </button>
  );
}
