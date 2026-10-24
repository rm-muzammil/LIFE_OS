interface DayData {
  date: string;
  totalScore: number | null;
}

function color(score: number | null): string {
  if (!score) return '#27272a';
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#86efac';
  if (score >= 40) return '#bbf7d0';
  return '#dcfce7';
}

export default function ActivityGrid({ data }: { data: DayData[] }) {
  const today = new Date();
  const days: string[] = [];
  for (let index = 89; index >= 0; index--) {
    const date = new Date(today);
    date.setDate(date.getDate() - index);
    days.push(date.toLocaleDateString('en-CA'));
  }
  const scores = new Map(data.map(({ date, totalScore }) => [date, totalScore]));
  const weeks: string[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((week, index) => (
        <div key={index} className="flex flex-col gap-1">
          {week.map((day) => (
            <div
              key={day}
              title={`${day}: ${scores.get(day) ?? 0}%`}
              className={`h-3 w-3 rounded-sm ${
                day === today.toLocaleDateString('en-CA') ? 'ring-1 ring-brand-400' : ''
              }`}
              style={{ backgroundColor: color(scores.get(day) ?? null) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
