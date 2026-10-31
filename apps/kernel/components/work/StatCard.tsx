export default function StatCard({
  label,
  value,
  sub,
  ok,
}: {
  label: string;
  value: string;
  sub?: string;
  ok?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
        {ok !== undefined && (
          <span className={`h-2 w-2 rounded-full ${ok ? 'bg-brand-400' : 'bg-zinc-700'}`} />
        )}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-50">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}
