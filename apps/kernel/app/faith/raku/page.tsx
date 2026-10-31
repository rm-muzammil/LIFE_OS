'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, RefreshCw } from 'lucide-react';
import type { FaithRakuProgress, FaithVocabWord } from '@/db/schema';
import StudyNav from '@/components/faith/study/StudyNav';

type RakuEdit = {
  tafseerDone: boolean;
  tajweedConfidence: number;
  vocabExtracted: boolean;
  notes: string;
};

const TOTAL_RAKUS = 558;

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === 'string') return body.error;
  } catch {
    // Use a status-based message when the endpoint has no JSON error body.
  }
  return `${fallback} (HTTP ${response.status})`;
}

export default function FaithRakuPage() {
  const [progress, setProgress] = useState<FaithRakuProgress[]>([]);
  const [vocab, setVocab] = useState<FaithVocabWord[]>([]);
  const [expanded, setExpanded] = useState<number | null>(1);
  const [edits, setEdits] = useState<Record<number, Partial<RakuEdit>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [progressResponse, vocabResponse] = await Promise.all([
        fetch('/api/faith/raku', { cache: 'no-store' }),
        fetch('/api/faith/vocab', { cache: 'no-store' }),
      ]);
      if (!progressResponse.ok) throw new Error(await responseError(progressResponse, 'Unable to load Raku progress'));
      if (!vocabResponse.ok) throw new Error(await responseError(vocabResponse, 'Unable to load vocabulary count'));
      const [progressData, vocabData] = await Promise.all([
        progressResponse.json() as Promise<FaithRakuProgress[]>,
        vocabResponse.json() as Promise<FaithVocabWord[]>,
      ]);
      setProgress(progressData);
      setVocab(vocabData);
      setEdits({});
      const completed = new Set(
        progressData
          .filter((item) => item.tafseerDone && item.tajweedConfidence > 0 && item.vocabExtracted)
          .map((item) => item.rakuNumber)
      );
      const next = Array.from({ length: TOTAL_RAKUS }, (_, index) => index + 1)
        .find((number) => !completed.has(number)) ?? TOTAL_RAKUS;
      setExpanded(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Raku progress.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const completed = useMemo(
    () => new Set(progress
      .filter((item) => item.tafseerDone && item.tajweedConfidence > 0 && item.vocabExtracted)
      .map((item) => item.rakuNumber)),
    [progress]
  );
  const currentRaku = useMemo(
    () => Array.from({ length: TOTAL_RAKUS }, (_, index) => index + 1)
      .find((number) => !completed.has(number)) ?? TOTAL_RAKUS,
    [completed]
  );
  const progressMap = useMemo(() => new Map(progress.map((item) => [item.rakuNumber, item])), [progress]);
  const visibleRakus = useMemo(() => {
    const numbers = new Set(progress.map((item) => item.rakuNumber));
    for (let number = Math.max(1, currentRaku - 2); number <= Math.min(TOTAL_RAKUS, currentRaku + 8); number += 1) {
      numbers.add(number);
    }
    return Array.from(numbers).sort((a, b) => a - b);
  }, [currentRaku, progress]);

  function getState(number: number): RakuEdit {
    const server = progressMap.get(number);
    const edit = edits[number] ?? {};
    return {
      tafseerDone: edit.tafseerDone ?? server?.tafseerDone ?? false,
      tajweedConfidence: edit.tajweedConfidence ?? server?.tajweedConfidence ?? 0,
      vocabExtracted: edit.vocabExtracted ?? server?.vocabExtracted ?? false,
      notes: edit.notes ?? server?.notes ?? '',
    };
  }

  function patch(number: number, patchValue: Partial<RakuEdit>) {
    setEdits((current) => ({ ...current, [number]: { ...current[number], ...patchValue } }));
  }

  async function saveRaku(number: number) {
    const state = getState(number);
    const server = progressMap.get(number);
    const finalTafseer = Boolean(server?.tafseerDone || state.tafseerDone);
    const finalTajweed = Math.max(server?.tajweedConfidence ?? 0, state.tajweedConfidence);
    const finalVocab = Boolean(server?.vocabExtracted || state.vocabExtracted);
    setSaving(number);
    setActionError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/faith/raku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rakuNumber: number,
          tafseerDone: state.tafseerDone,
          tajweedConfidence: state.tajweedConfidence,
          vocabExtracted: state.vocabExtracted,
          notes: state.notes,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response, `Unable to save Raku ${number}`));
      const saved = await response.json() as FaithRakuProgress;
      setProgress((current) => [...current.filter((item) => item.rakuNumber !== number), saved].sort((a, b) => a.rakuNumber - b.rakuNumber));
      setEdits((current) => {
        const next = { ...current };
        delete next[number];
        return next;
      });
      const isComplete = finalTafseer && finalTajweed > 0 && finalVocab;
      setNotice(isComplete ? `Raku ${number} complete.` : `Raku ${number} saved.`);
      if (isComplete) setExpanded(Math.min(TOTAL_RAKUS, number + 1));
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : `Unable to save Raku ${number}.`);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <StudyNav active="/faith/raku" />
      <header>
        <p className="text-sm text-zinc-500">Dr Israr Ahmad</p>
        <h1 className="mt-1 text-xl font-semibold text-zinc-100">Raku Tracker</h1>
      </header>

      {error && (
        <div role="alert" className="card flex flex-wrap items-center justify-between gap-3 border-red-900/70 p-4 text-sm text-red-300">
          <span>{error}</span>
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => void load()}>
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      )}
      {actionError && <p role="alert" className="rounded-xl border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-300">{actionError}</p>}
      {notice && <p role="status" className="rounded-xl border border-brand-500/25 bg-brand-500/10 p-3 text-sm text-brand-300">{notice}</p>}

      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <p className="text-xl font-semibold text-zinc-100">{loading ? '—' : completed.size}</p>
          <p className="text-xs text-zinc-500">Completed / {TOTAL_RAKUS}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xl font-semibold text-zinc-100">{loading ? '—' : `#${currentRaku}`}</p>
          <p className="text-xs text-zinc-500">Current Raku</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xl font-semibold text-zinc-100">{loading ? '—' : vocab.length}</p>
          <p className="text-xs text-zinc-500">Vocab words</p>
        </div>
      </div>

      <section className="card space-y-2 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-300">Tafseer Progress</span>
          <span className="font-mono text-xs text-brand-400">{loading ? '—' : `${completed.size}/${TOTAL_RAKUS}`}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(completed.size / TOTAL_RAKUS) * 100}%` }} />
        </div>
      </section>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs leading-relaxed text-zinc-400">
        A Raku is complete when all three are saved: <span className="text-brand-400">Tafseer</span>,{' '}
        <span className="text-brand-400">Tajweed rating</span>, and <span className="text-brand-400">Vocab extracted</span>.
        Criteria are cumulative — you can save them separately.
      </div>

      {loading ? (
        <div role="status" className="card space-y-2 p-4">
          {[...Array(4)].map((_, index) => <div key={index} className="h-14 animate-pulse rounded-lg bg-zinc-800" />)}
          <span className="sr-only">Loading Raku progress…</span>
        </div>
      ) : !error && progress.length === 0 ? (
        <p className="card p-4 text-sm text-zinc-500">
          No saved Raku progress yet. Start with Raku 1 below; your progress will appear here after the first save.
        </p>
      ) : null}

      {!loading && !error && (
        <div className="space-y-2">
          {visibleRakus.map((number) => {
            const state = getState(number);
            const server = progressMap.get(number);
            const isComplete = completed.has(number);
            const isCurrent = number === currentRaku;
            const criteria = [
              Boolean(server?.tafseerDone || state.tafseerDone),
              Math.max(server?.tajweedConfidence ?? 0, state.tajweedConfidence) > 0,
              Boolean(server?.vocabExtracted || state.vocabExtracted),
            ];
            const criteriaCount = criteria.filter(Boolean).length;
            const isExpanded = expanded === number;

            return (
              <section key={number} className={`card p-4 transition-colors ${isCurrent ? 'border-brand-500/30 bg-brand-500/5' : ''} ${isComplete && !isCurrent ? 'opacity-70' : ''}`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => setExpanded(isExpanded ? null : number)}
                  aria-expanded={isExpanded}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {isComplete ? <CheckCircle2 size={20} className="shrink-0 text-brand-400" /> : <Circle size={20} className={isCurrent ? 'shrink-0 text-brand-400' : 'shrink-0 text-zinc-600'} />}
                    <span>
                      <span className={`block text-sm font-semibold ${isCurrent ? 'text-brand-300' : 'text-zinc-200'}`}>
                        Raku {number} {isCurrent && <span className="ml-1 rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] text-brand-400">Current</span>}
                      </span>
                      <span className="block text-[11px] text-zinc-500">
                        {isComplete ? `Complete · tajweed ${server?.tajweedConfidence ?? state.tajweedConfidence}/5` : `${criteriaCount}/3 criteria met`}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-zinc-500">
                    {!isComplete && <span className="hidden gap-1 sm:flex">{['T', 'J', 'V'].map((label, index) => (
                      <span key={label} className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${criteria[index] ? 'bg-brand-500/30 text-brand-400' : 'bg-zinc-800 text-zinc-600'}`}>{label}</span>
                    ))}</span>}
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-4 space-y-4 border-t border-zinc-800 pt-4">
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-zinc-950/60 p-3">
                      <span>
                        <span className="block text-sm text-zinc-200">Tafseer watched</span>
                        <span className="text-xs text-zinc-500">Dr Israr — this Raku</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(server?.tafseerDone || state.tafseerDone)}
                        disabled={Boolean(server?.tafseerDone)}
                        onChange={(event) => patch(number, { tafseerDone: event.target.checked })}
                        className="h-4 w-4 accent-brand-500"
                      />
                    </label>

                    <fieldset>
                      <legend className="mb-2 text-sm text-zinc-200">Tajweed confidence</legend>
                      <div className="flex gap-2" role="group" aria-label={`Tajweed confidence for Raku ${number}`}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            aria-label={`Rate ${rating} out of 5`}
                            aria-pressed={Math.max(server?.tajweedConfidence ?? 0, state.tajweedConfidence) >= rating}
                            onClick={() => patch(number, { tajweedConfidence: Math.max(server?.tajweedConfidence ?? 0, rating) })}
                            className={`h-9 w-9 rounded-lg border text-sm ${Math.max(server?.tajweedConfidence ?? 0, state.tajweedConfidence) >= rating ? 'border-brand-500/40 bg-brand-500/15 text-brand-300' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'}`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-zinc-950/60 p-3">
                      <span>
                        <span className="block text-sm text-zinc-200">Vocab extracted</span>
                        <span className="text-xs text-zinc-500">Words added to the vocab bank</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(server?.vocabExtracted || state.vocabExtracted)}
                        disabled={Boolean(server?.vocabExtracted)}
                        onChange={(event) => patch(number, { vocabExtracted: event.target.checked })}
                        className="h-4 w-4 accent-brand-500"
                      />
                    </label>

                    <label className="block">
                      <span className="label">Notes</span>
                      <textarea
                        className="input resize-y"
                        rows={3}
                        placeholder="Notes (optional)…"
                        value={state.notes}
                        onChange={(event) => patch(number, { notes: event.target.value })}
                      />
                    </label>

                    {!isComplete && (
                      <p className="text-xs text-zinc-500">
                        Still needed: {[
                          !criteria[0] && 'Tafseer',
                          !criteria[1] && 'Tajweed rating',
                          !criteria[2] && 'Vocab extracted',
                        ].filter(Boolean).join(', ') || 'Nothing — save to complete!'}
                      </p>
                    )}
                    <button
                      type="button"
                      className="btn-primary w-full"
                      disabled={saving !== null}
                      onClick={() => void saveRaku(number)}
                    >
                      {saving === number ? 'Saving…' : isComplete ? `Save Raku ${number}` : criteriaCount === 3 ? `Save & Complete Raku ${number} ✓` : `Save Raku ${number} (${criteriaCount}/3)`}
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
