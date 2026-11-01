import { AdhkarPageClient } from '@/components/faith/dhikr/AdhkarPageClient';
import { EVENING_ADHKAR } from '@/lib/faith/adhkar';

export const dynamic = 'force-dynamic';

export default function EveningAdhkarPage() {
  return (
    <AdhkarPageClient
      title="Evening Adhkar"
      titleAr="أذكار المساء"
      subtitle="Recite after Asr prayer"
      items={EVENING_ADHKAR}
      today={new Date().toISOString().slice(0, 10)}
      initialCounts={{}}
      backHref="/faith/dhikr"
    />
  );
}
