'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, Circle, RefreshCw } from 'lucide-react';
import StudyNav from '@/components/faith/study/StudyNav';
import { JUZ30_SEQUENCE, TOTAL_JUZ30_VERSES } from '@/components/faith/study/quran-sequence';

type Verse = {
  surahNumber: number;
  ayahNumber: number;
  arabic: string;
  translation: string;
  surahName: string;
  globalIndex: number;
};

type VerseSettings = Record<string, string | null>;

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === 'string') return body.error;
  } catch {
    // Keep the status-based message below when the response has no JSON body.
  }
  return `${fallback} (HTTP ${response.status})`;
}

export default function FaithQuranPage() {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [verseLastAdvanced, setVerseLastAdvanced] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState<'done' | 'skip' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [verseResponse, settingsResponse] = await Promise.all([
        fetch('/api/faith/verse', { cache: 'no-store' }),
        fetch('/api/faith/settings?key=verse_last_advanced', { cache: 'no-store' }),
      ]);
      if (!verseResponse.ok) throw new Error(await responseError(verseResponse, 'Unable to load the current verse'));
      if (!settingsResponse.ok) throw new Error(await responseError(settingsResponse, 'Unable to load verse settings'));
      const [verseData, settingsData] = await Promise.all([
        verseResponse.json() as Promise<Verse>,
        settingsResponse.json() as Promise<VerseSettings>,
      ]);
      setVerse(verseData);
      setVerseLastAdvanced(settingsData.verse_last_advanced ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the current verse.');
      setVerse(null);
      setVerseLastAdvanced(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const alreadyDoneToday = verseLastAdvanced === today;
  const currentIndex = verse?.globalIndex ?? 0;
  const progressPercent = verse ? Math.round((currentIndex / TOTAL_JUZ30_VERSES) * 100) : 0;
  const surahRows = useMemo(
    () =>
      JUZ30_SEQUENCE.filter((item) => item.ayahNumber === 1).map((surah) => {
        const verses = JUZ30_SEQUENCE.filter((item) => item.surahNumber === surah.surahNumber);
        const done = verses.filter((item) => currentIndex > JUZ30_SEQUENCE.indexOf(item)).length;
        const isCurrent = verse?.surahNumber === surah.surahNumber;
        return { ...surah, verses, done, isCurrent, complete: done === verses.length };
      }),
    [currentIndex, verse]
  );

  async function markDone() {
    if (alreadyDoneToday || saving) return;
    setSaving('done');
    setActionError(null);
    try {
      const response = await fetch('/api/faith/verse', { method: 'POST' });
      if (!response.ok) throw new Error(await responseError(response, 'Unable to mark the verse done'));
      const result = (await response.json()) as { index: number; verseDone: boolean };
      if (typeof result.index !== 'number' || result.verseDone !== true) {
        throw new Error('The server returned an invalid verse completion response.');
      }
      await load();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : 'Unable to mark the verse done.');
    } finally {
      setSaving(null);
    }
  }

  async function skipVerse() {
    if (!verse || saving) return;
    const nextIndex = (verse.globalIndex + 1) % TOTAL_JUZ30_VERSES;
    setSaving('skip');
    setActionError(null);
    try {
      const response = await fetch('/api/faith/verse', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: nextIndex }),
      });
      if (!response.ok) throw new Error(await responseError(response, 'Unable to skip this verse'));
      const result = (await response.json()) as { index: number };
      if (typeof result.index !== 'number') throw new Error('The server returned an invalid verse position.');
      await load();
    } catch (skipError) {
      setActionError(skipError instanceof Error ? skipError.message : 'Unable to skip this verse.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <StudyNav active="/faith/quran" />
      <header>
        <p className="text-sm text-zinc-500">Memorization</p>
        <h1 className="mt-1 text-xl font-semibold text-zinc-100">Juz 30</h1>
      </header>

      {error && (
        <div role="alert" className="card flex flex-wrap items-center justify-between gap-3 border-red-900/70 p-4 text-sm text-red-300">
          <span>{error}</span>
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => void load()}>
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      )}

      <section className="card space-y-3 p-4" aria-label="Overall progress">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-300">Overall Progress</span>
          <span className="font-mono text-xs text-brand-400">
            {loading || error ? '—' : `${currentIndex}/${TOTAL_JUZ30_VERSES}`}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="text-xs text-zinc-500">
          {loading ? 'Loading progress…' : error ? 'Progress unavailable' : `${progressPercent}% complete`}
        </p>
      </section>

      <section className="card space-y-4 border-brand-500/25 bg-brand-500/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-400">
            <BookOpen size={16} /> Current Verse
          </div>
          {verse && (
            <span className="font-mono text-xs text-zinc-500">
              {verse.surahName} {verse.surahNumber}:{verse.ayahNumber}
            </span>
          )}
        </div>
        {alreadyDoneToday && (
          <div className="flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/15 px-3 py-2 text-xs font-medium text-brand-300">
            <CheckCircle2 size={16} /> Marked done today — showing tomorrow&apos;s verse
          </div>
        )}
        {loading ? (
          <div role="status" className="space-y-3 py-4">
            <div className="h-8 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
            <span className="sr-only">Loading the current verse…</span>
          </div>
        ) : verse ? (
          <>
            <p className="font-arabic text-2xl leading-[2.4] text-zinc-100" dir="rtl">{verse.arabic}</p>
            <p className="border-t border-zinc-800 pt-3 text-sm italic leading-relaxed text-zinc-400">
              “{verse.translation}”
            </p>
          </>
        ) : !error ? (
          <p className="py-5 text-center text-sm text-zinc-500">No verse is available right now.</p>
        ) : null}
        {actionError && <p role="alert" className="text-sm text-red-300">{actionError}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className="btn-primary flex flex-1 items-center justify-center gap-2"
            onClick={() => void markDone()}
            disabled={!verse || saving !== null || alreadyDoneToday}
          >
            <CheckCircle2 size={16} />
            {alreadyDoneToday ? 'Done Today ✓' : saving === 'done' ? 'Saving…' : 'Mark Done'}
          </button>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1.5"
            onClick={() => void skipVerse()}
            disabled={!verse || saving !== null}
          >
            {saving === 'skip' ? 'Skipping…' : 'Skip'} <ChevronRight size={16} />
          </button>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">Juz 30 Surahs</h2>
        {loading ? (
          <div role="status" className="space-y-2">
            {[...Array(5)].map((_, index) => <div key={index} className="h-10 animate-pulse rounded-lg bg-zinc-800" />)}
            <span className="sr-only">Loading surah progress…</span>
          </div>
        ) : error ? (
          <p className="text-sm text-zinc-500">Surah progress is unavailable until the verse position loads.</p>
        ) : (
          <div className="space-y-1">
            {surahRows.map((surah) => (
              <div
                key={surah.surahNumber}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  surah.isCurrent ? 'border border-brand-500/30 bg-brand-500/15' : 'hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {surah.complete
                    ? <CheckCircle2 size={16} className="shrink-0 text-brand-400" />
                    : <Circle size={16} className="shrink-0 text-zinc-600" />}
                  <div>
                    <p className={`text-sm ${surah.isCurrent ? 'font-semibold text-brand-300' : 'text-zinc-300'}`}>
                      {surah.surahName}
                    </p>
                    <p className="text-[10px] text-zinc-600">{surah.verses.length} verses</p>
                  </div>
                </div>
                <span className="font-mono text-xs text-zinc-500">{surah.done}/{surah.verses.length}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
