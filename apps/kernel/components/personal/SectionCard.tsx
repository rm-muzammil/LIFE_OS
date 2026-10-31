export default function SectionCard({
  title,
  score,
  maxScore,
  children,
}: {
  title: string;
  score: number;
  maxScore: number;
  children: React.ReactNode;
}) {
  return (
    <section className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-100">{title}</h2>
        <span className="text-sm font-semibold text-brand-300">
          {Math.round(score)}<span className="text-zinc-500">/{maxScore}</span>
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${Math.min(100, (score / maxScore) * 100)}%` }}
        />
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
