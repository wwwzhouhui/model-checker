import type { TestResult, TestStatus } from "@/types";

function StatusIcon({ status }: { status: TestStatus }) {
  switch (status) {
    case "success":
      return <span className="status-dot status-dot-success" />;
    case "failed":
      return <span className="status-dot status-dot-error" />;
    case "testing":
      return <span className="status-dot status-dot-testing" />;
    default:
      return <span className="status-dot status-dot-pending" />;
  }
}

export default function ModelTable({
  models,
  results,
  onRetestOne,
}: {
  models: string[];
  results: Map<string, TestResult>;
  onRetestOne: (modelId: string) => void;
}) {
  if (models.length === 0) return null;

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      <div className="overflow-x-auto">
        <table className="w-full table-dark min-w-[540px]">
          <thead>
            <tr className="text-left">
              <th className="w-12 text-center">#</th>
              <th>模型 ID</th>
              <th className="w-16 text-center">状态</th>
              <th className="hidden sm:table-cell w-24 text-right">耗时</th>
              <th className="hidden md:table-cell">错误信息</th>
              <th className="w-16 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {models.map((id, idx) => {
              const r = results.get(id);
              const status: TestStatus = r?.status ?? "pending";
              const title =
                r?.error
                  ? `${r.latency ?? "-"}ms | ${r.error}`
                  : r?.latency != null
                    ? `${r.latency}ms`
                    : undefined;
              return (
                <tr key={id} title={title}>
                  <td className="text-center" style={{ color: "var(--text-muted)" }}>
                    {idx + 1}
                  </td>
                  <td className="font-mono text-xs break-all" style={{ color: "var(--text-primary)" }}>
                    {id}
                  </td>
                  <td className="text-center">
                    <StatusIcon status={status} />
                  </td>
                  <td
                    className="hidden sm:table-cell text-right font-mono text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {r?.latency != null ? (
                      <span>
                        {r.latency}
                        <span style={{ color: "var(--text-muted)" }}>ms</span>
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>-</span>
                    )}
                  </td>
                  <td
                    className="hidden md:table-cell text-xs max-w-xs truncate"
                    style={{ color: "var(--error)" }}
                  >
                    {r?.error ?? ""}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => onRetestOne(id)}
                      disabled={status === "testing"}
                      className="text-xs px-2 py-1 rounded-md transition-colors"
                      style={{
                        color: status === "testing" ? "var(--text-muted)" : "var(--accent)",
                        cursor: status === "testing" ? "not-allowed" : "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (status !== "testing") {
                          e.currentTarget.style.background = "var(--accent-muted)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      重测
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
