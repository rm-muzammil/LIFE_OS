"use client";
// app/quran/impact/page.tsx

import { useState, useEffect } from "react";
import { SURAH_RUKU_MAP } from "@/lib/quranData";

interface ImpactVerse {
  id: number;
  surahNum: number;
  ayahNum: number;
  surahName: string;
  arabic: string;
  translation: string;
  personalNote: string | null;
  savedAt: string;
}

export default function ImpactPage() {
  const [verses, setVerses] = useState<ImpactVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state for adding
  const [form, setForm] = useState({
    surahNum: "",
    ayahNum: "",
    arabic: "",
    translation: "",
    personalNote: "",
  });

  const fetchVerses = async () => {
    const res = await fetch("/api/impact");
    const json = await res.json();
    setVerses(json.verses ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchVerses();
  }, []);

  const saveVerse = async () => {
    if (!form.surahNum || !form.ayahNum || !form.arabic || !form.translation) return;
    setSaving(true);
    const surah = SURAH_RUKU_MAP.find((s) => s.surahNum === parseInt(form.surahNum));
    await fetch("/api/impact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surahNum: parseInt(form.surahNum),
        ayahNum: parseInt(form.ayahNum),
        surahName: surah?.name ?? `Surah ${form.surahNum}`,
        arabic: form.arabic,
        translation: form.translation,
        personalNote: form.personalNote || null,
      }),
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ surahNum: "", ayahNum: "", arabic: "", translation: "", personalNote: "" });
    fetchVerses();
  };

  const saveNote = async (id: number) => {
    await fetch(`/api/impact?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalNote: noteText }),
    });
    setEditingNote(null);
    fetchVerses();
  };

  const deleteVerse = async (id: number) => {
    if (!confirm("Remove this verse from your collection?")) return;
    await fetch(`/api/impact?id=${id}`, { method: "DELETE" });
    fetchVerses();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
            Verses of Impact · آيات الأثر
          </p>
          <h1 className="text-2xl font-bold text-zinc-100">
            {verses.length} Saved{" "}
            <span className="text-green-500">Verses</span>
          </h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
            bg-green-500 hover:bg-green-400 text-zinc-950 transition-all"
        >
          + Save Verse
        </button>
      </div>

      {/* Empty state */}
      {verses.length === 0 && (
        <div className="text-center py-20">
          <p
            className="text-5xl text-zinc-700 mb-4 leading-[2]"
            style={{ fontFamily: "Amiri, serif" }}
            dir="rtl"
          >
            ۞
          </p>
          <p className="text-zinc-500 text-sm">
            Save verses that move your heart during study or prayer
          </p>
        </div>
      )}

      {/* Verse list */}
      <div className="space-y-4">
        {verses.map((v) => (
          <div
            key={v.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4
              hover:border-zinc-700 transition-colors group"
          >
            {/* Surah badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-green-400 bg-green-500/10
                border border-green-500/20 px-2.5 py-1 rounded-full">
                {v.surahName} :{v.ayahNum}
              </span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingNote(v.id);
                    setNoteText(v.personalNote ?? "");
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Edit note
                </button>
                <button
                  onClick={() => deleteVerse(v.id)}
                  className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Arabic */}
            <p
              className="text-2xl text-zinc-100 leading-[2.2] text-right"
              style={{ fontFamily: "Amiri, serif" }}
              dir="rtl"
            >
              {v.arabic}
            </p>

            {/* Translation */}
            <p className="text-sm text-zinc-400 leading-relaxed">{v.translation}</p>

            {/* Personal note */}
            {editingNote === v.id ? (
              <div className="space-y-2">
                <textarea
                  className="w-full h-20 bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm
                    text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none
                    focus:border-green-500/50"
                  placeholder="Your reflection on this verse…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingNote(null)}
                    className="flex-1 py-2 rounded-xl text-xs text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveNote(v.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-green-500 text-zinc-950 hover:bg-green-400 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : v.personalNote ? (
              <div className="border-t border-zinc-800 pt-3">
                <p className="text-xs text-zinc-500 mb-1">Your reflection</p>
                <p className="text-sm text-zinc-300 italic leading-relaxed">
                  "{v.personalNote}"
                </p>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingNote(v.id);
                  setNoteText("");
                }}
                className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
              >
                + Add personal reflection
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-zinc-100">Save a Verse of Impact</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Surah number</label>
                <input
                  type="number"
                  min={1}
                  max={114}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5
                    text-sm text-zinc-100 focus:outline-none focus:border-green-500/50"
                  value={form.surahNum}
                  onChange={(e) => setForm({ ...form, surahNum: e.target.value })}
                  placeholder="e.g. 2"
                />
                {form.surahNum && (
                  <p className="text-xs text-green-400 mt-1">
                    {SURAH_RUKU_MAP.find((s) => s.surahNum === parseInt(form.surahNum))?.name}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Ayah number</label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5
                    text-sm text-zinc-100 focus:outline-none focus:border-green-500/50"
                  value={form.ayahNum}
                  onChange={(e) => setForm({ ...form, ayahNum: e.target.value })}
                  placeholder="e.g. 255"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Arabic text</label>
              <textarea
                className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5
                  text-sm text-zinc-100 resize-none focus:outline-none focus:border-green-500/50
                  leading-[2]"
                style={{ fontFamily: "Amiri, serif", fontSize: "1.2rem" }}
                dir="rtl"
                placeholder="الآية الكريمة"
                value={form.arabic}
                onChange={(e) => setForm({ ...form, arabic: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Translation</label>
              <textarea
                className="w-full h-20 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5
                  text-sm text-zinc-100 resize-none focus:outline-none focus:border-green-500/50"
                placeholder="English translation…"
                value={form.translation}
                onChange={(e) => setForm({ ...form, translation: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">
                Personal reflection{" "}
                <span className="text-zinc-700">(optional)</span>
              </label>
              <textarea
                className="w-full h-16 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5
                  text-sm text-zinc-100 resize-none focus:outline-none focus:border-green-500/50"
                placeholder="Why does this verse move you?"
                value={form.personalNote}
                onChange={(e) => setForm({ ...form, personalNote: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveVerse}
                disabled={saving || !form.surahNum || !form.ayahNum || !form.arabic || !form.translation}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-500 hover:bg-green-400
                  text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Save Verse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}