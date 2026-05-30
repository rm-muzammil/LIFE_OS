export default function LifeScorePage() {
  return (
    <div className="space-y-4">
      <p className="label">Life Score</p>
      <h1 className="text-2xl font-semibold text-zinc-100">Coming in Phase 4</h1>
      <div className="card space-y-3">
        <p className="text-zinc-400 text-sm">Five-dimension weighted score:</p>
        <div className="space-y-2 text-sm">
          {[
            ['Faith',     '30%', 'from ibadah + raku + verse'],
            ['Knowledge', '20%', '← German Roadmap feed'],
            ['Health',    '20%', '← Personal App feed'],
            ['Character', '20%', 'from weekly ratings'],
            ['Mission',   '10%', 'weekly alignment check'],
          ].map(([dim, weight, src]) => (
            <div key={dim} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-zinc-800">
              <span className="text-zinc-300">{dim}</span>
              <span className="text-zinc-600 text-xs">{src}</span>
              <span className="text-brand-500 font-medium w-10 text-right">{weight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
