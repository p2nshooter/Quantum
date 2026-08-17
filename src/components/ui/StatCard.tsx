export function StatCard({
  label,
  value,
  hint,
  tone = 'default'
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warning' | 'success';
}) {
  const valueTone =
    tone === 'warning'
      ? 'text-gold-600 dark:text-gold-400'
      : tone === 'success'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-900 dark:text-white';

  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-black tabular-nums ${valueTone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
