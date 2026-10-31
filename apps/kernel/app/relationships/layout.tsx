import RelationshipsNav from '@/components/relationships/RelationshipsNav';

export default function RelationshipsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-100">Relationships</h1>
        <p className="mt-1 text-sm text-zinc-500">Family ties, service, and good deeds.</p>
      </header>
      <RelationshipsNav />
      {children}
    </section>
  );
}
