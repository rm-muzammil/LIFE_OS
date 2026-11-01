'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import type { FaithVocabWord } from '@/db/schema';
import StudyNav from '@/components/faith/study/StudyNav';

type VocabForm = {
  rakuNumber: number;
  word: string;
  root: string;
  meaning: string;
  status: string;
};

const EMPTY_FORM: VocabForm = { rakuNumber: 1, word: '', root: '', meaning: '', status: 'new' };
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-zinc-800 text-zinc-300',
  reviewing: 'bg-amber-500/20 text-amber-300',
  mastered: 'bg-brand-500/20 text-brand-300',
};

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === 'string') return body.error;
  } catch {
    // Keep the status-based message if the endpoint returned no JSON.
  }
  return `${fallback} (HTTP ${response.status})`;
}

export default function FaithVocabPage() {
  const [words, setWords] = useState<FaithVocabWord[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<VocabForm>(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/faith/vocab', { cache: 'no-store' });
      if (!response.ok) throw new Error(await responseError(response, 'Unable to load vocabulary'));
      setWords(await response.json() as FaithVocabWord[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load vocabulary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return words;
    return words.filter((item) =>
      item.word.toLocaleLowerCase().includes(query) ||
      item.meaning.toLocaleLowerCase().includes(query) ||
      (item.root ?? '').toLocaleLowerCase().includes(query)
    );
  }, [search, words]);

  async function addWord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.word.trim() || !form.meaning.trim()) {
      setActionError('Word and meaning are required.');
      return;
    }
    if (!Number.isInteger(form.rakuNumber) || form.rakuNumber < 1) {
      setActionError('Enter a valid Raku number.');
      return;
    }
    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/faith/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error(await responseError(response, 'Unable to add this word'));
      const saved = await response.json() as FaithVocabWord;
      setWords((current) => [saved, ...current]);
      setForm(EMPTY_FORM);
      setShowAdd(false);
      setNotice('Word added to your vocabulary bank.');
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : 'Unable to add this word.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteWord(id: string) {
    setDeleting(id);
    setActionError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/faith/vocab?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await responseError(response, 'Unable to delete this word'));
      setWords((current) => current.filter((item) => item.id !== id));
      setNotice('Word removed from your vocabulary bank.');
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this word.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-5">
      <StudyNav active="/faith/vocab" />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">Arabic</p>
          <h1 className="mt-1 text-xl font-semibold text-zinc-100">Vocab Bank</h1>
        </div>
        <button type="button" onClick={() => setShowAdd((value) => !value)} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} /> {showAdd ? 'Close' : 'Add word'}
        </button>
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
        {(['new', 'reviewing', 'mastered'] as const).map((status) => (
          <div key={status} className="card p-3 text-center">
            <p className="text-xl font-semibold text-zinc-100">{loading ? '—' : words.filter((word) => word.status === status).length}</p>
            <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_COLORS[status]}`}>{status}</p>
          </div>
        ))}
      </div>

      {showAdd && (
        <form className="card space-y-4 p-4" onSubmit={(event) => void addWord(event)}>
          <h2 className="text-sm font-semibold text-zinc-200">New Word</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label">Word *</span>
              <input
                className="input"
                required
                dir="auto"
                placeholder="e.g. رَحْمَة"
                value={form.word}
                onChange={(event) => setForm((current) => ({ ...current, word: event.target.value }))}
              />
            </label>
            <label>
              <span className="label">Root</span>
              <input
                className="input"
                dir="auto"
                placeholder="e.g. ر-ح-م"
                value={form.root}
                onChange={(event) => setForm((current) => ({ ...current, root: event.target.value }))}
              />
            </label>
          </div>
          <label className="block">
            <span className="label">Meaning *</span>
            <input
              className="input"
              required
              placeholder="Translation / meaning"
              value={form.meaning}
              onChange={(event) => setForm((current) => ({ ...current, meaning: event.target.value }))}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label">Raku #</span>
              <input
                className="input"
                type="number"
                min={1}
                max={558}
                value={form.rakuNumber}
                onChange={(event) => setForm((current) => ({ ...current, rakuNumber: Number(event.target.value) || 1 }))}
              />
            </label>
            <label>
              <span className="label">Status</span>
              <select className="input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="mastered">Mastered</option>
              </select>
            </label>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Add Word'}
          </button>
        </form>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          className="input pl-9"
          type="search"
          placeholder={`Search ${loading ? '' : words.length} words…`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search vocabulary"
          disabled={loading || Boolean(error)}
        />
      </div>

      {loading ? (
        <div role="status" className="space-y-2">
          {[...Array(4)].map((_, index) => <div key={index} className="card h-20 animate-pulse" />)}
          <span className="sr-only">Loading vocabulary…</span>
        </div>
      ) : error ? null : filtered.length === 0 ? (
        <div className="card py-12 text-center text-zinc-500">
          <BookOpen size={30} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">{words.length === 0 ? 'No words yet. Add vocabulary as you study each Raku.' : 'No words match your search.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((word) => (
            <article key={word.id} className="card flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-arabic text-lg text-zinc-100" dir="auto">{word.word}</span>
                  {word.root && <span className="font-mono text-xs text-zinc-500" dir="auto">{word.root}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLORS[word.status] ?? 'bg-zinc-800 text-zinc-300'}`}>{word.status}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-300">{word.meaning}</p>
                <p className="mt-1 text-[10px] text-zinc-500">Raku {word.rakuNumber}</p>
              </div>
              <button
                type="button"
                aria-label={`Delete ${word.word}`}
                title="Delete word"
                disabled={deleting !== null}
                onClick={() => void deleteWord(word.id)}
                className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
