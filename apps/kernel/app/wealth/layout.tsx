import WealthNav from '@/components/wealth/WealthNav';

export default function WealthLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-100">Wealth</h1>
        <p className="mt-1 text-sm text-zinc-500">Income, expenses, zakat, goals, and debt.</p>
      </header>
      <WealthNav />
      {children}
    </section>
  );
}
