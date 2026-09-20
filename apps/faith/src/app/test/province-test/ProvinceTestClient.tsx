"use client";
import { useState, useEffect } from "react";
import { Send, RefreshCw, CheckCircle2, XCircle, Copy, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface PreviewData {
  endpoint: string;
  headers: Record<string, string>;
  payload: Record<string, unknown>;
  meta: {
    todayLogExists: boolean;
    streak: number;
    rakuCompleted: number;
    vocabWords: number;
  };
}

interface SendResult {
  status: number;
  ok: boolean;
  body: string;
  ms: number;
}

export function ProvinceTestClient() {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  async function loadPreview() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/province-preview");
      setPreview(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function sendTest() {
    if (!preview) return;
    setSending(true);
    setResult(null);
    const start = Date.now();
    try {
      // Get real API key from settings
      const settingsRes = await fetch("/api/settings");
      const settingsData = await settingsRes.json();
      const apiKey = settingsData.api_key ?? "";

      const res = await fetch(preview.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify(preview.payload),
      });
      const body = await res.text();
      setResult({ status: res.status, ok: res.ok, body, ms: Date.now() - start });
      if (res.ok) toast.success("Push successful!");
      else toast.error(`SK responded: ${res.status}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      setResult({ status: 0, ok: false, body: msg, ms: Date.now() - start });
      toast.error("Push failed — SK unreachable");
    } finally {
      setSending(false);
    }
  }

  function copyPayload() {
    if (!preview) return;
    navigator.clipboard.writeText(JSON.stringify(preview.payload, null, 2));
    toast.success("Copied to clipboard");
  }

  useEffect(() => { loadPreview(); }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Integration</p>
          <h1 className="text-xl font-bold text-zinc-100">Province Test</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Preview and test what gets pushed to Self-Khilafah
          </p>
        </div>
        <button
          onClick={loadPreview}
          className="btn-ghost flex items-center gap-2 text-xs"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
        </div>
      ) : preview ? (
        <>
          {/* Meta stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Today's Log", preview.meta.todayLogExists ? "exists ✓" : "none yet", preview.meta.todayLogExists],
              ["Streak", `${preview.meta.streak} days`, preview.meta.streak > 0],
              ["Raku Completed", preview.meta.rakuCompleted, true],
              ["Vocab Words", preview.meta.vocabWords, true],
            ].map(([label, val, good]) => (
              <div key={label as string} className={cn(
                "card border",
                good ? "border-brand-500/20 bg-brand-500/5" : "border-zinc-700"
              )}>
                <p className="text-xs text-zinc-500">{label as string}</p>
                <p className={cn("text-lg font-bold mt-0.5", good ? "text-brand-400" : "text-zinc-400")}>
                  {String(val)}
                </p>
              </div>
            ))}
          </div>

          {/* Endpoint */}
          <div className="card space-y-2">
            <p className="section-title mb-0">Endpoint</p>
            <code className="text-xs text-zinc-300 break-all block bg-zinc-800 rounded-lg px-3 py-2">
              POST {preview.endpoint}
            </code>
            <div className="flex gap-2 text-xs">
              <span className="text-zinc-500">X-Api-Key:</span>
              <span className="text-zinc-400 font-mono">{preview.headers["X-Api-Key"]}</span>
            </div>
          </div>

          {/* Payload */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <p className="section-title mb-0">Payload</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="btn-ghost text-xs flex items-center gap-1.5 py-1 px-2"
                >
                  <Eye className="w-3 h-3" />
                  {showRaw ? "Formatted" : "Raw JSON"}
                </button>
                <button
                  onClick={copyPayload}
                  className="btn-ghost text-xs flex items-center gap-1.5 py-1 px-2"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            </div>

            {showRaw ? (
              <pre className="text-xs text-zinc-300 bg-zinc-800 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(preview.payload, null, 2)}
              </pre>
            ) : (
              <div className="space-y-2">
                {/* Top level */}
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(preview.payload)
                    .filter(([k]) => k !== "details")
                    .map(([key, val]) => (
                      <div key={key} className="flex justify-between bg-zinc-800/60 rounded-lg px-2.5 py-1.5">
                        <span className="text-xs text-zinc-500 font-mono">{key}</span>
                        <span className={cn(
                          "text-xs font-mono font-semibold",
                          val === true ? "text-brand-400"
                          : val === false ? "text-red-400"
                          : "text-zinc-300"
                        )}>
                          {JSON.stringify(val)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Details */}
                {typeof preview.payload.details === "object" && preview.payload.details !== null && (
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1.5 mt-2">
                      details
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(preview.payload.details as Record<string, unknown>).map(([key, val]) => (
                        <div key={key} className="flex justify-between bg-zinc-800/40 rounded-lg px-2.5 py-1.5">
                          <span className="text-[11px] text-zinc-500 font-mono">{key}</span>
                          <span className={cn(
                            "text-[11px] font-mono font-semibold",
                            val === true ? "text-brand-400"
                            : val === false ? "text-red-400"
                            : "text-zinc-300"
                          )}>
                            {JSON.stringify(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={sendTest}
            disabled={sending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? "Sending…" : "Send Test Push to Self-Khilafah"}
          </button>

          {/* Result */}
          {result && (
            <div className={cn(
              "card border animate-slide-up",
              result.ok ? "border-brand-500/30 bg-brand-500/5" : "border-red-500/30 bg-red-500/5"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {result.ok
                  ? <CheckCircle2 className="w-4 h-4 text-brand-400" />
                  : <XCircle className="w-4 h-4 text-red-400" />}
                <span className={cn(
                  "text-sm font-semibold",
                  result.ok ? "text-brand-300" : "text-red-300"
                )}>
                  {result.ok ? "Success" : "Failed"} — HTTP {result.status || "no response"}
                </span>
                <span className="text-xs text-zinc-600 ml-auto">{result.ms}ms</span>
              </div>
              <pre className="text-xs text-zinc-400 bg-zinc-800 rounded-lg p-2 overflow-x-auto">
                {result.body || "(empty response)"}
              </pre>
            </div>
          )}

          {/* Note about auto-push */}
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2.5 text-xs text-zinc-500 leading-relaxed">
            This exact payload is automatically pushed to Self-Khilafah every time you save the daily log.
            The push is fire-and-forget — it never blocks saving even if SK is unreachable.
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-500">Failed to load preview.</p>
      )}
    </div>
  );
}