"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthContext";

// --- 类型定义 ---

interface HistoryItem {
  id: number;
  configName: string;
  baseUrl: string;
  total: number;
  success: number;
  failed: number;
  createdAt: string;
}

interface HistoryDetail extends HistoryItem {
  configId: number | null;
  resultsJson: string;
}

interface TestResult {
  modelId: string;
  status: "success" | "failed" | "pending" | "testing";
  latency?: number;
  error?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// --- 工具函数 ---

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateUrl(url: string, maxLen = 40): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen) + "...";
}

// --- 详情弹窗 ---

interface DetailModalProps {
  historyId: number;
  onClose: () => void;
}

function DetailModal({ historyId, onClose }: DetailModalProps) {
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/histories/${historyId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setDetail(data.history);
        }
      })
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }, [historyId]);

  let results: TestResult[] = [];
  if (detail?.resultsJson) {
    try {
      results = JSON.parse(detail.resultsJson);
    } catch {
      // 解析失败时保持空数组
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center glass-overlay animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        className="glass-card-glow w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col animate-slide-up"
      >
        {/* 弹窗头部 */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            检测详情
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.background = "var(--bg-tertiary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.background = "transparent";
            }}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* 弹窗内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-2">
              <span
                className="inline-block w-5 h-5 rounded-full border-2"
                style={{
                  borderColor: "var(--accent)",
                  borderTopColor: "transparent",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                加载中...
              </span>
            </div>
          )}
          {error && (
            <div
              className="text-center py-12 text-sm"
              style={{ color: "var(--error)" }}
            >
              {error}
            </div>
          )}
          {detail && !loading && (
            <>
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    平台名称
                  </div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {detail.configName}
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    检测时间
                  </div>
                  <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {formatDate(detail.createdAt)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    地址
                  </div>
                  <div
                    className="text-sm break-all font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {detail.baseUrl}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
                    统计
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge badge-neutral">
                      共 {detail.total} 个
                    </span>
                    <span className="badge badge-success">
                      <span className="status-dot status-dot-success" style={{ width: 6, height: 6 }} />
                      {detail.success} 成功
                    </span>
                    <span className="badge badge-error">
                      <span className="status-dot status-dot-error" style={{ width: 6, height: 6 }} />
                      {detail.failed} 失败
                    </span>
                  </div>
                </div>
              </div>

              {/* 检测结果表格 */}
              {results.length > 0 ? (
                <>
                  <div
                    className="text-sm font-medium mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    检测结果（{results.length} 个模型）
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full table-dark">
                      <thead>
                        <tr className="text-left">
                          <th>模型 ID</th>
                          <th className="w-24 text-center">状态</th>
                          <th className="w-24 text-right">延迟</th>
                          <th>错误信息</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, idx) => (
                          <tr key={idx}>
                            <td
                              className="font-mono text-xs break-all"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {r.modelId}
                            </td>
                            <td className="text-center">
                              {r.status === "success" ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--success)" }}>
                                  <span className="status-dot status-dot-success" />
                                  成功
                                </span>
                              ) : r.status === "failed" ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--error)" }}>
                                  <span className="status-dot status-dot-error" />
                                  失败
                                </span>
                              ) : (
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                  {r.status}
                                </span>
                              )}
                            </td>
                            <td
                              className="text-right font-mono text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {r.latency !== undefined ? (
                                <span>
                                  {r.latency}
                                  <span style={{ color: "var(--text-muted)" }}>ms</span>
                                </span>
                              ) : (
                                <span style={{ color: "var(--text-muted)" }}>-</span>
                              )}
                            </td>
                            <td
                              className="text-xs max-w-xs truncate"
                              style={{ color: "var(--error)" }}
                            >
                              {r.error || (
                                <span style={{ color: "var(--text-muted)" }}>-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div
                  className="text-center py-6 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  暂无检测结果数据
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- 分页组件 ---

interface PaginationBarProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

function PaginationBar({ pagination, onPageChange }: PaginationBarProps) {
  const { page, totalPages } = pagination;
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
        共 <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{pagination.total}</span> 条，第{" "}
        <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{page}</span> /{" "}
        <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{totalPages}</span> 页
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-ghost text-xs py-1.5 px-3"
          style={{ opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? "not-allowed" : "pointer" }}
        >
          上一页
        </button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={idx} className="px-2 text-sm" style={{ color: "var(--text-muted)" }}>
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className="px-3 py-1.5 text-xs rounded-md border transition-all"
              style={{
                background: p === page ? "var(--accent)" : "transparent",
                borderColor: p === page ? "var(--accent)" : "var(--border)",
                color: p === page ? "var(--bg-primary)" : "var(--text-secondary)",
                fontWeight: p === page ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (p !== page) {
                  e.currentTarget.style.borderColor = "var(--text-muted)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                }
              }}
              onMouseLeave={(e) => {
                if (p !== page) {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-ghost text-xs py-1.5 px-3"
          style={{ opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
        >
          下一页
        </button>
      </div>
    </div>
  );
}

// --- 主页面 ---

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();

  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [detailId, setDetailId] = useState<number | null>(null);

  const fetchHistories = useCallback(
    async (page: number, searchVal: string) => {
      setListLoading(true);
      setListError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
          ...(searchVal ? { search: searchVal } : {}),
        });
        const res = await fetch(`/api/histories?${params}`);
        const data = await res.json();
        if (!res.ok) {
          setListError(data.error || "加载失败");
          return;
        }
        setHistories(data.histories);
        setPagination(data.pagination);
      } catch {
        setListError("网络错误，请重试");
      } finally {
        setListLoading(false);
      }
    },
    []
  );

  // 搜索或分页变化时重新加载
  useEffect(() => {
    if (!user) return;
    fetchHistories(currentPage, search);
  }, [user, currentPage, search, fetchHistories]);

  // 搜索时重置到第一页
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 重新检测：跳转首页并带上参数
  const handleRecheck = async (item: HistoryItem) => {
    // 先获取详情，检查是否有 configId
    try {
      const res = await fetch(`/api/histories/${item.id}`);
      const data = await res.json();
      if (res.ok && data.history) {
        const detail: HistoryDetail = data.history;
        if (detail.configId) {
          window.location.href = `/?configId=${detail.configId}`;
        } else {
          window.location.href = `/?baseUrl=${encodeURIComponent(detail.baseUrl)}`;
        }
      } else {
        // 回退：直接用列表中的 baseUrl
        window.location.href = `/?baseUrl=${encodeURIComponent(item.baseUrl)}`;
      }
    } catch {
      window.location.href = `/?baseUrl=${encodeURIComponent(item.baseUrl)}`;
    }
  };

  // 删除
  const handleDelete = async (item: HistoryItem) => {
    if (!window.confirm(`确认删除「${item.configName}」的检测记录？`)) return;
    try {
      const res = await fetch(`/api/histories/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "删除失败");
        return;
      }
      // 刷新当前页（如果删除后当前页为空，退到上一页）
      const newTotal = pagination.total - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / pagination.limit));
      const targetPage = currentPage > newTotalPages ? newTotalPages : currentPage;
      setCurrentPage(targetPage);
      fetchHistories(targetPage, search);
    } catch {
      alert("网络错误，请重试");
    }
  };

  // --- 渲染 ---

  if (authLoading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-2">
          <span
            className="inline-block w-5 h-5 rounded-full border-2"
            style={{
              borderColor: "var(--accent)",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            加载中...
          </span>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="glass-card p-12">
          <svg
            className="mx-auto mb-4"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--text-muted)" }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="mb-5 text-sm" style={{ color: "var(--text-muted)" }}>
            请先登录后查看检测历史
          </p>
          <a href="/" className="btn-accent inline-block text-sm">
            返回首页
          </a>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* 页头 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            <span className="text-gradient">检测历史</span>
          </h1>
          <div className="relative w-full sm:w-auto">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--text-muted)" }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="搜索平台名称..."
              value={search}
              onChange={handleSearchChange}
              className="input-dark pl-9 w-full sm:w-56 text-sm"
            />
          </div>
        </div>

        {/* 表格 */}
        <div className="glass-card overflow-hidden animate-slide-up">
          {listLoading ? (
            <div className="py-16 text-center">
              <div className="flex items-center justify-center gap-2">
                <span
                  className="inline-block w-5 h-5 rounded-full border-2"
                  style={{
                    borderColor: "var(--accent)",
                    borderTopColor: "transparent",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  加载中...
                </span>
              </div>
            </div>
          ) : listError ? (
            <div
              className="text-center py-16 text-sm"
              style={{ color: "var(--error)" }}
            >
              {listError}
            </div>
          ) : histories.length === 0 ? (
            <div className="py-16 text-center">
              <svg
                className="mx-auto mb-3"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--text-muted)", opacity: 0.5 }}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {search ? "未找到匹配的记录" : "暂无检测历史"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full table-dark min-w-[700px]">
                  <thead>
                    <tr className="text-left">
                      <th className="w-12 text-center">#</th>
                      <th>平台名称</th>
                      <th>地址</th>
                      <th className="hidden sm:table-cell whitespace-nowrap">检测时间</th>
                      <th className="whitespace-nowrap text-center">结果</th>
                      <th className="w-40 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {histories.map((item, idx) => (
                      <tr key={item.id}>
                        <td
                          className="text-center"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {(currentPage - 1) * pagination.limit + idx + 1}
                        </td>
                        <td
                          className="font-medium text-sm"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item.configName}
                        </td>
                        <td
                          className="font-mono text-xs max-w-[200px] truncate"
                          style={{ color: "var(--text-secondary)" }}
                          title={item.baseUrl}
                        >
                          {truncateUrl(item.baseUrl)}
                        </td>
                        <td
                          className="hidden sm:table-cell text-xs whitespace-nowrap"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 text-xs">
                            <span className="font-mono" style={{ color: "var(--text-secondary)" }}>
                              {item.total}
                            </span>
                            <span style={{ color: "var(--border)" }}>/</span>
                            <span className="inline-flex items-center gap-1" style={{ color: "var(--success)" }}>
                              <span className="status-dot status-dot-success" style={{ width: 6, height: 6 }} />
                              {item.success}
                            </span>
                            <span style={{ color: "var(--border)" }}>/</span>
                            <span className="inline-flex items-center gap-1" style={{ color: "var(--error)" }}>
                              <span className="status-dot status-dot-error" style={{ width: 6, height: 6 }} />
                              {item.failed}
                            </span>
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetailId(item.id)}
                              className="text-xs px-2.5 py-1 rounded-md transition-colors font-medium"
                              style={{ color: "var(--accent)" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "var(--accent-muted)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                              }}
                            >
                              详情
                            </button>
                            <button
                              onClick={() => handleRecheck(item)}
                              className="text-xs px-2.5 py-1 rounded-md transition-colors"
                              style={{ color: "var(--text-secondary)" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = "var(--text-primary)";
                                e.currentTarget.style.background = "var(--bg-tertiary)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = "var(--text-secondary)";
                                e.currentTarget.style.background = "transparent";
                              }}
                            >
                              重测
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="text-xs px-2.5 py-1 rounded-md transition-colors"
                              style={{ color: "var(--text-muted)" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = "var(--error)";
                                e.currentTarget.style.background = "var(--error-muted)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = "var(--text-muted)";
                                e.currentTarget.style.background = "transparent";
                              }}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              <div className="px-4 pb-4">
                <PaginationBar
                  pagination={pagination}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </div>
      </main>

      {/* 详情弹窗 */}
      {detailId !== null && (
        <DetailModal
          historyId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  );
}
