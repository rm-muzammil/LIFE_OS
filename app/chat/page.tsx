'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ChatBubble from '@/components/ChatBubble';
import type { ChatMessagePayload, ProvinceWithMeta } from '@/lib/types';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [provinces, setProvinces] = useState<ProvinceWithMeta[]>([]);
  const [input, setInput] = useState('');
  const [feedsSchedule, setFeedsSchedule] = useState(true);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [chatRes, provRes] = await Promise.all([
      fetch('/api/chat', { cache: 'no-store' }),
      fetch('/api/provinces', { cache: 'no-store' }),
    ]);
    const chatJson = await chatRes.json();
    const provJson = await provRes.json();
    setMessages(chatJson.messages ?? []);
    setProvinces(provJson.provinces ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput('');

    // Optimistic append
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: 'user',
        content,
        date: new Date().toISOString().slice(0, 10),
        feedsSchedule,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, feedsSchedule }),
      });
      const json = await res.json();
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        json.userMessage,
        json.assistantMessage,
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-4rem)] md:h-screen px-4">
      <div className="py-4 border-b border-zinc-900">
        <h1 className="text-lg font-semibold text-zinc-100 mb-3">Assistant</h1>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {provinces.map((p) => (
            <div
              key={p.slug}
              className="shrink-0 rounded-lg bg-zinc-900/60 border border-zinc-900 px-2.5 py-1 text-[11px] text-zinc-500"
            >
              {p.name}: <span className="text-zinc-300 font-medium">{p.cachedScore?.toFixed(0) ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {loading && <p className="text-sm text-zinc-600">Loading...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-zinc-600 text-center mt-8">
            Say something — it'll shape tonight's schedule for tomorrow.
          </p>
        )}
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="py-4 border-t border-zinc-900">
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-1.5 text-[11px] text-zinc-600">
            <input
              type="checkbox"
              checked={feedsSchedule}
              onChange={(e) => setFeedsSchedule(e.target.checked)}
              className="rounded accent-brand-500"
            />
            Feed this into tomorrow's schedule
          </label>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message..."
            rows={1}
            className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-brand-500 resize-none"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-zinc-950 disabled:opacity-40 transition-opacity"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
