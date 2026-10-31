'use client';

type Props = {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

export default function Toggle({ label, sublabel, checked, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`card flex w-full items-center justify-between p-4 text-left transition-colors ${
        checked ? 'border-brand-700 bg-brand-950/40' : 'hover:border-zinc-700'
      }`}
    >
      <span>
        <span className="block text-sm font-medium text-zinc-100">{label}</span>
        {sublabel && <span className="mt-0.5 block text-xs text-zinc-500">{sublabel}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-zinc-50 transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}
