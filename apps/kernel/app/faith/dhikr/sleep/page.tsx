import { AdhkarPageClient } from '@/components/faith/dhikr/AdhkarPageClient';
import { BEFORE_SLEEP_ADHKAR } from '@/lib/faith/adhkar';

export const dynamic = 'force-dynamic';

export default function SleepAdhkarPage() {
  return (
    <AdhkarPageClient
      title="Before Sleep"
      titleAr="أذكار النوم"
      subtitle="Recite before sleeping"
      items={BEFORE_SLEEP_ADHKAR}
      today={new Date().toISOString().slice(0, 10)}
      initialCounts={{}}
      backHref="/faith/dhikr"
    />
  );
}
