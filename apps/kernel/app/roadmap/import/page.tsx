'use client';

import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { Download, FileUp, Trash2 } from 'lucide-react';
import RoadmapError from '@/components/roadmap/RoadmapError';
import { roadmapRequest } from '@/lib/roadmap/client';
import type { RoadmapCsvPreview } from '@/lib/roadmap/types';

interface DuplicateImport {
  createdAt: string;
  completedAt: string | null;
  rowCount: number;
  goalCount: number;
  milestoneCount: number;
  taskCount: number;
}

interface PreviewResult {
  batchId: string;
  filename: string;
  preview: RoadmapCsvPreview;
  duplicate: DuplicateImport | null;
}

interface ImportBatch {
  id: string;
  filename: string;
  status: string;
  rowCount: number;
  goalCount: number;
  milestoneCount: number;
  taskCount: number;
  skippedCount: number;
  errorCount: number;
  createdAt: string;
  completedAt: string | null;
}

interface DeleteCounts {
  goals: number;
  milestones: number;
  tasks: number;
  completedTasks: number;
}

interface DeleteState {
  batch: ImportBatch;
  counts: DeleteCounts;
}

function formatDate(value: string | null): string {
  if (!value) return 'date unavailable';
  return new Date(value).toLocaleString();
}

export default function RoadmapImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshBatches = useCallback(async () => {
    const result = await roadmapRequest<{ batches: ImportBatch[] }>('/api/roadmap/import/batches', { cache: 'no-store' });
    setBatches(result.batches);
  }, []);

  useEffect(() => {
    refreshBatches()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load import history.'))
      .finally(() => setLoading(false));
  }, [refreshBatches]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setPreview(null);
    setMessage(null);
  }

  async function createPreview() {
    if (!file) {
      setError('Choose a CSV file first.');
      return;
    }
    setPreviewing(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.set('file', file);
      const result = await roadmapRequest<PreviewResult>('/api/roadmap/import/preview', {
        method: 'POST',
        body: form,
      });
      setPreview(result);
      await refreshBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to preview this CSV.');
    } finally {
      setPreviewing(false);
    }
  }

  async function confirmImport() {
    if (!file || !preview) return;
    setConfirming(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('batchId', preview.batchId);
      const result = await roadmapRequest<{ goals: number; milestones: number; tasks: number; skipped: number }>(
        '/api/roadmap/import/confirm',
        { method: 'POST', body: form }
      );
      setMessage(`Imported ${result.goals} goals, ${result.milestones} milestones, and ${result.tasks} tasks; skipped ${result.skipped} row(s).`);
      setPreview(null);
      setFile(null);
      await refreshBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm this import.');
      await refreshBatches().catch(() => undefined);
    } finally {
      setConfirming(false);
    }
  }

  async function cancelPreview() {
    if (!preview) return;
    setError(null);
    try {
      await roadmapRequest(`/api/roadmap/import/batches/${preview.batchId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      setPreview(null);
      await refreshBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel this preview.');
    }
  }

  async function requestDelete(batch: ImportBatch) {
    setError(null);
    try {
      const result = await roadmapRequest<{ confirmRequired?: boolean; counts: DeleteCounts }>(
        `/api/roadmap/import/batches/${batch.id}`,
        { method: 'DELETE' }
      );
      if (result.confirmRequired) setDeleteState({ batch, counts: result.counts });
      else await refreshBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to prepare batch deletion.');
    }
  }

  async function confirmDelete() {
    if (!deleteState) return;
    setDeleting(true);
    setError(null);
    try {
      await roadmapRequest(`/api/roadmap/import/batches/${deleteState.batch.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      setDeleteState(null);
      setMessage(`Deleted import batch “${deleteState.batch.filename}” and its descendants.`);
      if (preview?.batchId === deleteState.batch.id) setPreview(null);
      await refreshBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete import batch.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <RoadmapError message={error} />
      {message && <p role="status" className="text-sm text-brand-300">{message}</p>}

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Import a roadmap CSV</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Preview validated goals, milestones, and tasks before adding them to your account.
          </p>
        </div>
        <a
          href="/api/roadmap/import/template"
          className="inline-flex items-center gap-2 text-sm text-brand-300 hover:text-brand-200"
        >
          <Download size={16} /> Download CSV template
        </a>
        <label className="block">
          <span className="label">CSV file (up to 1 MB)</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFileChange}
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-sm file:text-zinc-300"
          />
        </label>
        {file && <p className="text-xs text-zinc-500">{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
        <button type="button" onClick={() => void createPreview()} disabled={!file || previewing} className="btn-primary">
          <FileUp className="mr-1 inline" size={16} />
          {previewing ? 'Preparing preview…' : 'Preview CSV'}
        </button>
      </section>

      {preview && (
        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Preview · {preview.filename}</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {preview.preview.rows.length} row(s) · {preview.preview.skippedCount} skipped · {preview.preview.errors.length} issue(s)
              </p>
            </div>
            <div className="text-right text-xs text-zinc-500">
              <p>{preview.duplicate ? 'Previous import found' : 'No previous import found'}</p>
              {preview.duplicate && (
                <p className="mt-1">
                  {formatDate(preview.duplicate.completedAt ?? preview.duplicate.createdAt)} · {preview.duplicate.rowCount} row(s)
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {Object.entries(preview.preview.importableCounts).map(([kind, count]) => (
              <div key={kind} className="rounded-xl bg-zinc-950/60 p-3 text-center">
                <p className="text-lg font-semibold text-zinc-100">{count}</p>
                <p className="text-xs capitalize text-zinc-500">{kind}s to import</p>
              </div>
            ))}
          </div>

          {preview.preview.errors.length > 0 && (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-amber-200">Rows with issues are skipped:</p>
              {preview.preview.errors.slice(0, 100).map((issue, index) => (
                <p key={`${issue.row}-${issue.column}-${index}`} className="text-xs text-amber-100/70">
                  Row {issue.row}, {issue.column}: {issue.reason}
                </p>
              ))}
              {preview.preview.errors.length > 100 && (
                <p className="text-xs text-amber-100/70">And {preview.preview.errors.length - 100} more issue(s).</p>
              )}
            </div>
          )}

          {preview.duplicate && (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200">
              This file appears to have been imported before. Confirm only if you intend to import it again.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void confirmImport()} disabled={confirming || preview.preview.importableCounts.goal + preview.preview.importableCounts.milestone + preview.preview.importableCounts.task === 0} className="btn-primary">
              {confirming ? 'Importing…' : 'Confirm import'}
            </button>
            <button type="button" onClick={() => void cancelPreview()} disabled={confirming} className="btn-secondary">Cancel preview</button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Import history</h2>
          <button type="button" onClick={() => void refreshBatches()} className="text-xs text-brand-300">Refresh</button>
        </div>
        {loading ? <p className="text-sm text-zinc-500">Loading imports…</p> : batches.length === 0 ? (
          <p className="card p-4 text-sm text-zinc-500">No imports yet.</p>
        ) : batches.map((batch) => (
          <div key={batch.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-200">{batch.filename}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {batch.status} · {batch.rowCount} rows ({batch.goalCount} goals, {batch.milestoneCount} milestones, {batch.taskCount} tasks)
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {formatDate(batch.completedAt ?? batch.createdAt)}
                {batch.skippedCount > 0 ? ` · ${batch.skippedCount} skipped` : ''}
                {batch.errorCount > 0 ? ` · ${batch.errorCount} with issues` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void requestDelete(batch)}
              aria-label={`Delete ${batch.filename} import`}
              className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </section>

      {deleteState && (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-batch-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-md space-y-4 p-5">
            <h2 id="delete-batch-title" className="font-semibold text-zinc-100">Delete import and descendants?</h2>
            <p className="text-sm text-zinc-400">
              Deleting this batch removes {deleteState.counts.goals} goal(s), {deleteState.counts.milestones} milestone(s), and {deleteState.counts.tasks} task(s), including {deleteState.counts.completedTasks} completed task(s). This includes manual descendants attached to imported goals.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteState(null)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={() => void confirmDelete()} disabled={deleting} className="rounded-xl bg-red-500 px-4 py-2 font-medium text-white disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
