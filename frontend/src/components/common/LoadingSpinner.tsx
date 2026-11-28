export function LoadingSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex animate-fade-up items-center justify-center gap-3 py-12 text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
      <span className="animate-pulse text-sm">{label}</span>
    </div>
  );
}
