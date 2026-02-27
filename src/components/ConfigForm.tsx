"use client";

import { useState, useEffect } from "react";
import type { ApiConfig, Provider } from "@/types";
import { PROVIDER_LABELS, PROVIDER_DEFAULT_BASE_URL } from "@/types";

const PROVIDERS = Object.entries(PROVIDER_LABELS) as [Provider, string][];

const API_KEY_PLACEHOLDERS: Record<Provider, string> = {
  openai: "sk-...",
  anthropic: "sk-ant-...",
  gemini: "AIza...",
};

const PROVIDER_COLORS: Record<Provider, string> = {
  openai: "#10b981",
  anthropic: "#f59e0b",
  gemini: "#06b6d4",
};

interface ConfigFormProps {
  onSubmit: (config: ApiConfig) => void;
  loading: boolean;
  initialBaseUrl?: string;
  initialApiKey?: string;
  initialProvider?: Provider;
  autoSubmit?: boolean;
}

export default function ConfigForm({
  onSubmit,
  loading,
  initialBaseUrl,
  initialApiKey,
  initialProvider,
  autoSubmit,
}: ConfigFormProps) {
  const [provider, setProvider] = useState<Provider>(initialProvider ?? "openai");
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl ?? "");
  const [apiKey, setApiKey] = useState(initialApiKey ?? "");

  // 外部初始值变化时同步
  useEffect(() => {
    if (initialBaseUrl !== undefined) setBaseUrl(initialBaseUrl);
  }, [initialBaseUrl]);

  useEffect(() => {
    if (initialApiKey !== undefined) setApiKey(initialApiKey);
  }, [initialApiKey]);

  useEffect(() => {
    if (initialProvider !== undefined) setProvider(initialProvider);
  }, [initialProvider]);

  // autoSubmit：初始值就绪时自动触发提交
  useEffect(() => {
    if (autoSubmit && initialApiKey) {
      const p = initialProvider ?? "openai";
      onSubmit({
        baseUrl: (initialBaseUrl ?? "").trim(),
        apiKey: initialApiKey.trim(),
        provider: p,
      });
    }
    // 只在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit]);

  // 切换 provider 时自动填入默认 Base URL
  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    const defaultUrl = PROVIDER_DEFAULT_BASE_URL[newProvider];
    if (defaultUrl) {
      setBaseUrl(defaultUrl);
    } else {
      setBaseUrl("");
    }
  };

  // openai 必须填 baseUrl，其他有默认值可以不填
  const needBaseUrl = provider === "openai";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needBaseUrl && !baseUrl.trim()) return;
    if (!apiKey.trim()) return;
    onSubmit({
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      provider,
    });
  };

  const canSubmit =
    !loading && apiKey.trim() && (needBaseUrl ? baseUrl.trim() : true);

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
      {/* Provider 选择 */}
      <div>
        <label
          className="block text-sm font-medium mb-2.5"
          style={{ color: "var(--text-secondary)" }}
        >
          模型厂商
        </label>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map(([key, label]) => {
            const isSelected = provider === key;
            const color = PROVIDER_COLORS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleProviderChange(key)}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-all flex items-center gap-2"
                style={{
                  background: isSelected ? `${color}20` : "transparent",
                  borderColor: isSelected ? `${color}60` : "var(--border)",
                  color: isSelected ? color : "var(--text-secondary)",
                  boxShadow: isSelected ? `0 0 12px ${color}15` : "none",
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
                {/* Color dot indicator */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Base URL */}
        <div>
          <label
            htmlFor="baseUrl"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            请求地址 (Base URL)
            {!needBaseUrl && (
              <span className="font-normal ml-1" style={{ color: "var(--text-muted)" }}>
                （可选，留空使用官方地址）
              </span>
            )}
          </label>
          <input
            id="baseUrl"
            type="url"
            placeholder={
              provider === "openai"
                ? "https://api.example.com"
                : PROVIDER_DEFAULT_BASE_URL[provider]
            }
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            required={needBaseUrl}
            className="input-dark w-full"
            style={{
              background: !needBaseUrl ? "var(--bg-secondary)" : undefined,
            }}
          />
        </div>

        {/* API Key */}
        <div>
          <label
            htmlFor="apiKey"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            API Key
          </label>
          <input
            id="apiKey"
            type="password"
            placeholder={API_KEY_PLACEHOLDERS[provider]}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            className="input-dark w-full font-mono"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="btn-accent w-full md:w-auto"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span
              className="inline-block w-4 h-4 rounded-full border-2"
              style={{
                borderColor: "var(--text-inverse)",
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
              }}
            />
            获取中...
          </span>
        ) : (
          "获取模型列表"
        )}
      </button>
    </form>
  );
}
