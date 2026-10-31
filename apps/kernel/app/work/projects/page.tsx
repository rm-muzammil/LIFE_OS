'use client';

import ProjectsClient from '@/components/work/ProjectsClient';

export default function WorkProjectsPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-zinc-500">Track progress and target dates</p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-100">Projects</h2>
      </header>
      <ProjectsClient />
    </div>
  );
}
