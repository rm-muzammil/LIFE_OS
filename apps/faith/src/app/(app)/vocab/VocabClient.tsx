"use client";
import { useState } from "react";
import { Plus, Trash2, BookOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { VocabBank } from "@/db/schema";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-zinc-700 text-zinc-300",
  reviewing: "bg-amber-500/20 text-amber-400",
  mastered: "bg-brand-500/20 text-brand-400",
};

interface Props {
  initialWords: VocabBank[];
}

export function VocabClient({ initialWords }: Props) {
  const [words, setWords] = useState(initialWords);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ rakuNumber: 1, word: "", root: "", meaning: "", status: "new" });
  const [saving, setSaving] = useState(false);

  const filtered = words.filter(
    (w) =>
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.meaning.toLowerCase().includes(search.toLowerCase()) ||
      (w.root ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function addWord() {
    if (!form.word || !form.meaning) return toast.error("Word and meaning required");
    setSaving(true);
    try {
      const res = await fetch("/api/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const saved = await res.json();
      setWords((prev) => [saved, ...prev]);
      setForm({ rakuNumber: 1, word: "", root: "", meaning: "", status: "new" });
      setShowAdd(false);
      toast.success("Word added");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWord(id: number) {
    await fetch(`/api/vocab?id=${id}`, { method: "DELETE" });
    setWords((prev) => prev.filter((w) => w.id !== id));
    toast.success("Removed");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Arabic</p>
          <h1 className="text-xl font-bold text-zinc-100">Vocab Bank</h1>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {(["new", "reviewing", "mastered"] as const).map((s) => {
          const ct = words.filter((w) => w.status === s).length;
          return (
            <div key={s} className="card text-center">
              <p className="text-xl font-bold text-zinc-100">{ct}</p>
              <p className={cn("text-xs mt-0.5 capitalize rounded-full px-2 py-0.5 inline-block", STATUS_COLORS[s])}>
                {s}
              </p>
            </div>
          );
        })}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card space-y-3 animate-slide-up">
          <p className="section-title mb-0">New Word</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Word *</label>
              <input
                className="pill-input"
                placeholder="e.g. رَحْمَة"
                value={form.word}
                onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Root</label>
              <input
                className="pill-input"
                placeholder="e.g. ر-ح-م"
                value={form.root}
                onChange={(e) => setForm((f) => ({ ...f, root: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Meaning *</label>
            <input
              className="pill-input"
              placeholder="Translation / meaning"
              value={form.meaning}
              onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Raku #</label>
              <input
                type="number"
                className="pill-input"
                min={1}
                max={558}
                value={form.rakuNumber}
                onChange={(e) => setForm((f) => ({ ...f, rakuNumber: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Status</label>
              <select
                className="pill-input"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="mastered">Mastered</option>
              </select>
            </div>
          </div>
          <button onClick={addWord} disabled={saving} className="btn-primary w-full">
            {saving ? "Saving…" : "Add Word"}
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          className="pill-input pl-9"
          placeholder={`Search ${words.length} words…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Word list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-600">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No words yet. Add vocab as you study each raku.</p>
          </div>
        )}
        {filtered.map((w) => (
          <div key={w.id} className="card flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="arabic-text text-lg text-zinc-100">{w.word}</span>
                {w.root && (
                  <span className="text-xs text-zinc-500 font-mono">{w.root}</span>
                )}
                <span className={cn("text-[10px] rounded-full px-2 py-0.5", STATUS_COLORS[w.status])}>
                  {w.status}
                </span>
              </div>
              <p className="text-sm text-zinc-400 mt-0.5">{w.meaning}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">Raku {w.rakuNumber}</p>
            </div>
            <button
              onClick={() => deleteWord(w.id)}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
