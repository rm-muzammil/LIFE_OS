export default function WealthError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p role="alert" className="rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-300">
      {message}
    </p>
  );
}
