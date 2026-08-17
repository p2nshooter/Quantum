export function ProgressBar({ percent, showLabel = true }: { percent: number; showLabel?: boolean }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const tone = value >= 100 ? 'bg-emerald-500' : value >= 50 ? 'bg-quantum-600' : 'bg-gold-500';

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${value}%` }} />
      </div>
      {showLabel && <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums">{value}%</span>}
    </div>
  );
}
