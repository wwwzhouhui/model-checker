export default function ProgressBar({
  total,
  tested,
  success,
  failed,
}: {
  total: number;
  tested: number;
  success: number;
  failed: number;
}) {
  if (total === 0) return null;

  const percent = Math.round((tested / total) * 100);
  const pending = total - tested;
  const isActive = tested < total;

  return (
    <div className="glass-card p-5 space-y-3 animate-fade-in">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          检测进度
          <span className="font-mono ml-2" style={{ color: "var(--accent)" }}>
            {tested}/{total}
          </span>
          <span className="ml-1.5" style={{ color: "var(--text-muted)" }}>
            ({percent}%)
          </span>
        </span>
        <div className="flex items-center gap-3">
          <span className="badge badge-success">
            <span className="status-dot status-dot-success" style={{ width: 6, height: 6 }} />
            可用 {success}
          </span>
          <span className="badge badge-error">
            <span className="status-dot status-dot-error" style={{ width: 6, height: 6 }} />
            不可用 {failed}
          </span>
          <span className="badge badge-neutral">
            <span className="status-dot status-dot-pending" style={{ width: 6, height: 6 }} />
            待检测 {pending}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track">
        <div className="flex h-full">
          {success > 0 && (
            <div
              className="progress-fill-success"
              style={{ width: `${(success / total) * 100}%` }}
            />
          )}
          {failed > 0 && (
            <div
              className="progress-fill-error"
              style={{ width: `${(failed / total) * 100}%` }}
            />
          )}
        </div>
        {/* Scan line when active */}
        {isActive && <div className="progress-scan" />}
      </div>
    </div>
  );
}
