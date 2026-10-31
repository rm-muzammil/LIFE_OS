import WorkNav from '@/components/work/WorkNav';

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-100">Work</h1>
        <p className="mt-1 text-sm text-zinc-500">Daily career output, projects, and professional development.</p>
      </header>
      <WorkNav />
      {children}
    </section>
  );
}
