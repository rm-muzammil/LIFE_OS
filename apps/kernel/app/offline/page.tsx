export default function Offline() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 px-6">
      <div className="text-center space-y-3">
        <h1 className="text-xl font-semibold">You're offline</h1>
        <p className="text-sm text-zinc-500">
          Self-Khilafah needs a connection to sync with your provinces. Reconnect and try again.
        </p>
      </div>
    </div>
  );
}
