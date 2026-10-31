import WeeklyReflectionEditor from '@/components/relationships/WeeklyReflectionEditor';
import { BASE_MAX, POINTS, SCORE_CAP, WEEKLY_BONUS } from '@/lib/relationships/scoring';

const LABELS: Record<keyof typeof POINTS, string> = {
  contactedParents: 'Contacted parents',
  familyTies: 'Maintained family ties',
  helpedSomeone: 'Helped someone',
  goodDeed: 'Good deed done',
  communityObligation: 'Community / social obligation',
};

export default function RelationshipsSettingsPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">This week&apos;s reflection</h2>
          <p className="mt-1 text-sm text-zinc-500">Your reflection is private to your account.</p>
        </div>
        <WeeklyReflectionEditor />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Scoring reference</h2>
          <p className="mt-1 text-sm text-zinc-500">Charity, good-deed count, and notes are tracked but do not affect the score.</p>
        </div>
        <div className="card divide-y divide-zinc-800">
          {(Object.keys(POINTS) as (keyof typeof POINTS)[]).map((key) => (
            <div key={key} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-zinc-300">{LABELS[key]}</span>
              <span className="text-zinc-500">{POINTS[key]} pts</span>
            </div>
          ))}
          <ScoreRow label="Base total" value={`${BASE_MAX} pts`} />
          <ScoreRow label="Weekly reflection bonus" value={`+${WEEKLY_BONUS} pts`} valueClass="text-brand-300" />
          <ScoreRow label="Cap" value={`${SCORE_CAP} pts`} />
        </div>
      </section>
    </div>
  );
}

function ScoreRow({ label, value, valueClass = 'text-zinc-500' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-zinc-300">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
