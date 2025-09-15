export function DotsLoader() {
  return (
    <div className="flex items-center gap-2 text-zinc-700">
      <span className="h-2.5 w-2.5 rounded-full bg-zinc-900 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2.5 w-2.5 rounded-full bg-zinc-900 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2.5 w-2.5 rounded-full bg-zinc-900 animate-bounce" />
      <span className="ml-2 text-sm">Loading…</span>
    </div>
  );
}

// or a ring spinner:
export function RingLoader() {
  return (
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
  );
}
