export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const color = clamped >= 100 ? "bg-signal-green" : clamped > 0 ? "bg-signal-blue" : "bg-steel-300";
  return (
    <div className="w-full">
      <div className="h-2 w-full overflow-hidden rounded-full bg-steel-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <p className="mt-1 text-xs text-steel-500">{clamped}% complete</p>
    </div>
  );
}
