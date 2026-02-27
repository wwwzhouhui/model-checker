"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthContext";
import type { Provider } from "@/types";
import { PROVIDER_LABELS } from "@/types";

const PROVIDERS = Object.entries(PROVIDER_LABELS) as [Provider, string][];

const PROVIDER_COLORS: Record<Provider, string> = {
  openai: "#10b981",
  anthropic: "#f59e0b",
  gemini: "#06b6d4",
};

interface Config {
  id: number;
  name: string;
  base_url: string;
  api_key_masked: string;
  provider: Provider;
  created_at: string;
  updated_at: string;
}

interface ConfigFormData {
  name: string;
  base_url: string;
  api_key: string;
  provider: Provider;
}

const emptyForm: ConfigFormData = { name: "", base_url: "", api_key: "", provider: "openai" };

/** 模态框组件 */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center glass-overlay animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-card-glow w-full max-w-md mx-4 p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {title}
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
        {children}
      </div>
    </div>
  );
}

/** 配置表单 */
function ConfigFormInner({
  initialData,
  isEdit,
  submitting,
  onSubmit,
  onCancel,
}: {
  initialData: ConfigFormData;
  isEdit: boolean;
  submitting: boolean;
  onSubmit: (data: ConfigFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ConfigFormData>(initialData);

  const handleChange = (field: keyof ConfigFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          名称 <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          required
          placeholder="如：我的 GPT-4 配置"
          className="input-dark w-full"
        />
      </div>
      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          厂商
        </label>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map(([key, label]) => {
            const isSelected = form.provider === key;
            const color = PROVIDER_COLORS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleChange("provider", key)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border transition-all flex items-center gap-1.5"
                style={{
                  background: isSelected ? `${color}20` : "transparent",
                  borderColor: isSelected ? `${color}60` : "var(--border)",
                  color: isSelected ? color : "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "var(--text-muted)";
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.background = "var(--bg-tertiary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: color,
                    boxShadow: isSelected ? `0 0 6px ${color}80` : "none",
                  }}
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          地址
          {form.provider === "openai" ? (
            <span style={{ color: "var(--error)" }}> *</span>
          ) : (
            <span className="font-normal ml-1" style={{ color: "var(--text-muted)" }}>
              （可选，留空使用官方地址）
            </span>
          )}
        </label>
        <input
          type="url"
          value={form.base_url}
          onChange={(e) => handleChange("base_url", e.target.value)}
          required={!isEdit && form.provider === "openai"}
          placeholder="https://api.example.com"
          className="input-dark w-full"
        />
      </div>
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          API Key
          {!isEdit && <span style={{ color: "var(--error)" }}> *</span>}
        </label>
        <input
          type="password"
          value={form.api_key}
          onChange={(e) => handleChange("api_key", e.target.value)}
          required={!isEdit}
          placeholder={isEdit ? "不修改请留空" : "sk-..."}
          className="input-dark w-full font-mono"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn-accent flex-1"
        >
          {submitting ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost flex-1"
        >
          取消
        </button>
      </div>
    </form>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 弹窗状态
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Config | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/configs");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "加载失败");
        return;
      }
      setConfigs(data.configs ?? []);
    } catch {
      setError("网络错误，请刷新重试");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchConfigs();
  }, [user, fetchConfigs]);

  /** 新增 */
  const handleAdd = async (form: ConfigFormData) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "保存失败");
        return;
      }
      setShowAdd(false);
      await fetchConfigs();
    } catch {
      setFormError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  /** 编辑 */
  const handleEdit = async (form: ConfigFormData) => {
    if (!editTarget) return;
    setSubmitting(true);
    setFormError(null);

    const payload: Partial<ConfigFormData> = {};
    if (form.name) payload.name = form.name;
    if (form.base_url !== undefined) payload.base_url = form.base_url;
    if (form.api_key) payload.api_key = form.api_key;
    if (form.provider) payload.provider = form.provider;

    try {
      const res = await fetch(`/api/configs/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "保存失败");
        return;
      }
      setEditTarget(null);
      await fetchConfigs();
    } catch {
      setFormError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  /** 删除 */
  const handleDelete = async (config: Config) => {
    if (!window.confirm(`确认删除配置「${config.name}」？此操作不可恢复。`)) return;
    try {
      const res = await fetch(`/api/configs/${config.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "删除失败");
        return;
      }
      await fetchConfigs();
    } catch {
      alert("网络错误，请重试");
    }
  };

  /** 使用：获取真实 Key 后跳转首页 */
  const handleUse = async (config: Config) => {
    try {
      const res = await fetch(`/api/configs/${config.id}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "获取配置失败");
        return;
      }
      const { base_url, api_key } = data.config;
      const p = data.config.provider ?? "openai";
      const params = new URLSearchParams({ baseUrl: base_url, apiKey: api_key, provider: p });
      window.location.href = `/?${params.toString()}`;
    } catch {
      alert("网络错误，请重试");
    }
  };

  // 格式化时间
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return dateStr.replace("T", " ").slice(0, 16);
  };

  // --- 未登录状态 ---
  if (!loading && !user) {
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
            请先登录后查看配置管理
          </p>
          <a href="/" className="btn-accent inline-block text-sm">
            返回首页
          </a>
        </div>
      </main>
    );
  }

  // --- loading 状态 ---
  if (loading) {
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

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            <span className="text-gradient">我的配置</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            管理保存的 API 配置
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setShowAdd(true);
          }}
          className="btn-accent text-sm"
        >
          + 新增配置
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm animate-fade-in"
          style={{
            color: "var(--error)",
            background: "var(--error-muted)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          {error}
        </div>
      )}

      {/* 配置列表卡片 */}
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
        ) : configs.length === 0 ? (
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              暂无配置，点击「新增配置」添加
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-dark min-w-[640px]">
              <thead>
                <tr className="text-left">
                  <th>名称</th>
                  <th className="w-24 text-center">厂商</th>
                  <th>地址</th>
                  <th className="hidden sm:table-cell">API Key</th>
                  <th className="hidden md:table-cell">创建时间</th>
                  <th className="w-36 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => {
                  const providerColor = PROVIDER_COLORS[config.provider] ?? "var(--text-muted)";
                  return (
                    <tr key={config.id}>
                      <td
                        className="font-medium text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {config.name}
                      </td>
                      <td className="text-center">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            color: providerColor,
                            background: `${providerColor}15`,
                            border: `1px solid ${providerColor}30`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: providerColor }}
                          />
                          {PROVIDER_LABELS[config.provider] ?? config.provider}
                        </span>
                      </td>
                      <td
                        className="text-sm max-w-[200px] truncate"
                        style={{ color: "var(--text-secondary)" }}
                        title={config.base_url}
                      >
                        {config.base_url || (
                          <span style={{ color: "var(--text-muted)" }}>（默认地址）</span>
                        )}
                      </td>
                      <td
                        className="hidden sm:table-cell font-mono text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {config.api_key_masked}
                      </td>
                      <td
                        className="hidden md:table-cell text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDate(config.created_at)}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleUse(config)}
                            className="text-xs px-2.5 py-1 rounded-md transition-colors font-medium"
                            style={{ color: "var(--accent)" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "var(--accent-muted)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            使用
                          </button>
                          <button
                            onClick={() => {
                              setFormError(null);
                              setEditTarget(config);
                            }}
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
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(config)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新增弹窗 */}
      {showAdd && (
        <Modal title="新增配置" onClose={() => setShowAdd(false)}>
          {formError && (
            <div
              className="mb-3 text-sm text-center py-2 px-3 rounded-md animate-fade-in"
              style={{
                color: "var(--error)",
                background: "var(--error-muted)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {formError}
            </div>
          )}
          <ConfigFormInner
            initialData={emptyForm}
            isEdit={false}
            submitting={submitting}
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}

      {/* 编辑弹窗 */}
      {editTarget && (
        <Modal title="编辑配置" onClose={() => setEditTarget(null)}>
          {formError && (
            <div
              className="mb-3 text-sm text-center py-2 px-3 rounded-md animate-fade-in"
              style={{
                color: "var(--error)",
                background: "var(--error-muted)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {formError}
            </div>
          )}
          <ConfigFormInner
            initialData={{
              name: editTarget.name,
              base_url: editTarget.base_url,
              api_key: "",
              provider: editTarget.provider ?? "openai",
            }}
            isEdit={true}
            submitting={submitting}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
          />
        </Modal>
      )}
    </main>
  );
}
