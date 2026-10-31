import { AdhkarPageClient } from '@/components/faith/dhikr/AdhkarPageClient';
import { MORNING_ADHKAR } from '@/lib/faith/adhkar';

export const dynamic = 'force-dynamic';

export default function MorningAdhkarPage() {
  return (
    <AdhkarPageClient
      title="Morning Adhkar"
      titleAr="أذكار الصباح"
      subtitle="Recite after Fajr prayer"
      items={MORNING_ADHKAR}
      today={new Date().toISOString().slice(0, 10)}
      initialCounts={{}}
      backHref="/faith/dhikr"
    />
  );
}
