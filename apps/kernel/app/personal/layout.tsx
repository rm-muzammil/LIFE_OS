import PersonalNav from '@/components/personal/PersonalNav';

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-100">Personal</h1>
        <p className="mt-1 text-sm text-zinc-500">Daily health, training, nutrition, and recovery.</p>
      </header>
      <PersonalNav />
      {children}
    </section>
  );
}
