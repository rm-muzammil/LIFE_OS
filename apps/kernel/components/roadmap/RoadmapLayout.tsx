import RoadmapNav from '@/components/roadmap/RoadmapNav';

export default function RoadmapLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-100">Roadmap</h1>
        <p className="mt-1 text-sm text-zinc-500">Long-term goals, milestones, and next actions.</p>
      </header>
      <RoadmapNav />
      {children}
    </section>
  );
}
