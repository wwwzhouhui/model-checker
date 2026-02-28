"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { ApiConfig, Provider, TestResult } from "@/types";
import { PROVIDER_LABELS } from "@/types";
import ConfigForm from "@/components/ConfigForm";
import ProgressBar from "@/components/ProgressBar";
import ModelTable from "@/components/ModelTable";
import { useAuth } from "@/components/AuthContext";

// ---------- 类型 ----------

interface SavedConfig {
  id: number;
  name: string;
  base_url: string;
  api_key_masked: string;
  provider?: Provider;
}

// ---------- 内层组件（含 useSearchParams，必须在 Suspense 内） ----------

function HomeInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [results, setResults] = useState<Map<string, TestResult>>(new Map());
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // 已保存配置
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);

  // 保存配置提示
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [configSaveName, setConfigSaveName] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);

  // URL 参数注入
  const [initBaseUrl, setInitBaseUrl] = useState<string | undefined>(undefined);
  const [initApiKey, setInitApiKey] = useState<string | undefined>(undefined);
  const [initProvider, setInitProvider] = useState<Provider | undefined>(undefined);
  const [autoSubmit, setAutoSubmit] = useState(false);

  // ---------- 获取模型列表 ----------

  const handleFetchModels = useCallback(async (cfg: ApiConfig) => {
    setConfig(cfg);
    setFetchingModels(true);
    setError("");
    setModels([]);
    setResults(new Map());
    setShowSavePrompt(false);
    setShowSaveForm(false);

    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: cfg.baseUrl,
          apiKey: cfg.apiKey,
          provider: cfg.provider ?? "openai",
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || `请求失败 (${res.status})`);
        return;
      }

      const ids: string[] = (data.data ?? [])
        .map((m: { id: string }) => m.id)
        .sort((a: string, b: string) => a.localeCompare(b));

      if (ids.length === 0) {
        setError("该平台未返回任何模型");
        return;
      }
      setModels(ids);
    } catch {
      setError("网络请求失败，请检查地址是否正确");
    } finally {
      setFetchingModels(false);
    }
  }, []);

  // ---------- 测试单个模型 ----------

  const testOne = useCallback(
    async (modelId: string) => {
      if (!config) return;

      setResults((prev) => {
        const next = new Map(prev);
        next.set(modelId, { modelId, status: "testing" });
        return next;
      });

      try {
        const res = await fetch("/api/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            modelId,
            provider: config.provider ?? "openai",
          }),
        });
        const data = await res.json();

        setResults((prev) => {
          const next = new Map(prev);
          next.set(modelId, {
            modelId,
            status: data.success ? "success" : "failed",
            latency: data.latency,
            error: data.error,
          });
          return next;
        });
      } catch {
        setResults((prev) => {
          const next = new Map(prev);
          next.set(modelId, {
            modelId,
            status: "failed",
            error: "请求异常",
          });
          return next;
        });
      }
    },
    [config]
  );

  // ---------- 批量检测 ----------

  const handleTestAll = useCallback(async () => {
    if (models.length === 0) return;
    setTestingAll(true);
    setResults(new Map());

    const concurrency = 3;
    const queue = [...models];

    const worker = async () => {
      while (queue.length > 0) {
        const modelId = queue.shift();
        if (modelId) await testOne(modelId);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, models.length) }, () => worker())
    );
    setTestingAll(false);
  }, [models, testOne]);

  // ---------- 导出 Markdown ----------

  const handleCopyMarkdown = useCallback(() => {
    const lines = [
      `| # | 模型 ID | 状态 | 耗时 | 错误信息 |`,
      `|---|---------|------|------|----------|`,
    ];
    models.forEach((id, idx) => {
      const r = results.get(id);
      const status = r?.status === "success" ? "✓" : r?.status === "failed" ? "✗" : "○";
      const latency = r?.latency != null ? `${r.latency}ms` : "-";
      const err = r?.error ?? "";
      lines.push(`| ${idx + 1} | ${id} | ${status} | ${latency} | ${err} |`);
    });
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [models, results]);

  // ---------- 统计 ----------

  const tested = Array.from(results.values()).filter(
    (r) => r.status === "success" || r.status === "failed"
  ).length;
  const success = Array.from(results.values()).filter(
    (r) => r.status === "success"
  ).length;
  const failed = Array.from(results.values()).filter(
    (r) => r.status === "failed"
  ).length;

  // ---------- 功能 E：已登录时获取已保存配置列表 ----------

  useEffect(() => {
    if (!user) {
      setSavedConfigs([]);
      return;
    }
    fetch("/api/configs")
      .then((r) => r.json())
      .then((data) => setSavedConfigs(data.configs ?? []))
      .catch(() => setSavedConfigs([]));
  }, [user]);

  // ---------- 功能 A：URL 参数自动填入 ----------

  useEffect(() => {
    const urlBaseUrl = searchParams.get("baseUrl");
    const urlApiKey = searchParams.get("apiKey");
    const urlConfigId = searchParams.get("configId");
    const urlProvider = searchParams.get("provider") as Provider | null;

    if (urlConfigId) {
      fetch(`/api/configs/${urlConfigId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.config) {
            setInitBaseUrl(data.config.base_url);
            setInitApiKey(data.config.api_key);
            setInitProvider(data.config.provider ?? "openai");
            setSelectedConfigId(data.config.id);
            setAutoSubmit(true);
          }
        })
        .catch(() => {
          console.error("URL 参数中 configId 对应的配置获取失败");
        });
    } else if (urlApiKey) {
      setInitBaseUrl(urlBaseUrl ?? "");
      setInitApiKey(urlApiKey);
      if (urlProvider) setInitProvider(urlProvider);
      setAutoSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- OAuth 错误处理 ----------

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      // 解析错误信息（格式可能为 error_code:error_description）
      const [errorCode, errorDesc] = urlError.split(":");

      let friendlyError = "登录失败，请重试";

      if (errorCode === "timeout") {
        friendlyError = "GitHub 连接超时，可能是网络问题。建议：1) 使用 VPN 2) 使用 LinuxDo 登录";
      } else if (errorCode === "network_error") {
        friendlyError = "无法连接到 GitHub，建议使用 LinuxDo 登录或稍后重试";
      } else if (errorDesc) {
        friendlyError = decodeURIComponent(errorDesc);
      }

      setError(friendlyError);

      // 清除 URL 中的错误参数
      window.history.replaceState({}, "", "/");

      // 打开登录弹窗方便重试
      setTimeout(() => {
        document.querySelector('button[class*="btn-accent"]')?.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 功能 B：从已保存配置快速选择 ----------

  const handleSelectSavedConfig = useCallback(
    async (id: number) => {
      if (id === 0) {
        setSelectedConfigId(null);
        setInitBaseUrl(undefined);
        setInitApiKey(undefined);
        setInitProvider(undefined);
        setAutoSubmit(false);
        return;
      }
      setSelectedConfigId(id);
      try {
        const res = await fetch(`/api/configs/${id}`);
        const data = await res.json();
        if (data.config) {
          const p: Provider = data.config.provider ?? "openai";
          setInitBaseUrl(data.config.base_url);
          setInitApiKey(data.config.api_key);
          setInitProvider(p);
          handleFetchModels({
            baseUrl: data.config.base_url,
            apiKey: data.config.api_key,
            provider: p,
          });
        }
      } catch {
        console.error("获取配置详情失败");
      }
    },
    [handleFetchModels]
  );

  // ---------- 功能 C：检测完成后自动保存历史 ----------

  useEffect(() => {
    if (!user) return;
    if (testingAll) return;
    if (models.length === 0) return;
    if (tested !== models.length) return;
    if (!config) return;

    const selectedConfig = savedConfigs.find((c) => c.id === selectedConfigId);
    let configName: string;
    if (selectedConfig) {
      configName = selectedConfig.name;
    } else {
      try {
        configName = new URL(config.baseUrl).hostname;
      } catch {
        configName = config.baseUrl || PROVIDER_LABELS[config.provider ?? "openai"];
      }
    }

    const resultsJson = models.map((id) => {
      const r = results.get(id);
      return {
        modelId: id,
        status: r?.status ?? "pending",
        latency: r?.latency,
        error: r?.error,
      };
    });

    fetch("/api/histories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config_id: selectedConfigId ?? null,
        config_name: configName,
        base_url: config.baseUrl || PROVIDER_LABELS[config.provider ?? "openai"],
        total: models.length,
        success,
        failed,
        results_json: JSON.stringify(resultsJson),
      }),
    })
      .then(() => console.log("历史已自动保存"))
      .catch(() => console.error("历史自动保存失败"));

    if (selectedConfigId === null) {
      setShowSavePrompt(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testingAll]);

  // ---------- 功能 D：保存当前配置 ----------

  const handleSaveConfig = useCallback(async () => {
    if (!config || !configSaveName.trim()) return;
    setSavingConfig(true);
    try {
      const res = await fetch("/api/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: configSaveName.trim(),
          base_url: config.baseUrl,
          api_key: config.apiKey,
          provider: config.provider ?? "openai",
        }),
      });
      const data = await res.json();
      if (res.ok && data.config) {
        setSavedConfigs((prev) => [...prev, { ...data.config, api_key_masked: "***" }]);
        setSelectedConfigId(data.config.id);
        setShowSavePrompt(false);
        setShowSaveForm(false);
        setConfigSaveName("");
      }
    } catch {
      console.error("保存配置失败");
    } finally {
      setSavingConfig(false);
    }
  }, [config, configSaveName]);

  // ---------- 渲染 ----------

  const isTestingDone = models.length > 0 && tested === models.length && !testingAll;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-center animate-fade-in">
        <span className="text-gradient">AI 模型可用性检测</span>
      </h1>

      {/* 功能 B：已保存配置快速选择（仅登录用户） */}
      {user && savedConfigs.length > 0 && (
        <div className="glass-card px-4 py-3 flex items-center gap-3 animate-slide-up">
          <label
            htmlFor="savedConfig"
            className="text-sm font-medium whitespace-nowrap"
            style={{ color: "var(--text-secondary)" }}
          >
            快速选择配置
          </label>
          <select
            id="savedConfig"
            value={selectedConfigId ?? 0}
            onChange={(e) => handleSelectSavedConfig(Number(e.target.value))}
            className="input-dark flex-1"
          >
            <option value={0}>-- 手动输入 --</option>
            {savedConfigs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.provider ? PROVIDER_LABELS[c.provider] : "OpenAI"} - {c.base_url || "默认地址"})
              </option>
            ))}
          </select>
        </div>
      )}

      <ConfigForm
        onSubmit={handleFetchModels}
        loading={fetchingModels}
        initialBaseUrl={initBaseUrl}
        initialApiKey={initApiKey}
        initialProvider={initProvider}
        autoSubmit={autoSubmit}
      />

      {/* Error */}
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

      {/* 功能 D：保存此配置提示 */}
      {user && showSavePrompt && isTestingDone && (
        <div
          className="rounded-lg px-4 py-3 text-sm flex flex-col gap-2 animate-slide-up"
          style={{
            color: "var(--accent)",
            background: "var(--accent-muted)",
            border: "1px solid rgba(6, 182, 212, 0.2)",
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span>提示：保存此配置后可在下次快速使用。</span>
            <div className="flex gap-2">
              {!showSaveForm && (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="btn-accent text-xs py-1 px-3"
                >
                  保存配置
                </button>
              )}
              <button
                onClick={() => { setShowSavePrompt(false); setShowSaveForm(false); }}
                className="btn-ghost text-xs py-1 px-3"
              >
                忽略
              </button>
            </div>
          </div>
          {showSaveForm && (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                placeholder="配置名称，如：我的 OpenAI"
                value={configSaveName}
                onChange={(e) => setConfigSaveName(e.target.value)}
                className="input-dark flex-1"
              />
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig || !configSaveName.trim()}
                className="btn-accent text-sm py-1.5 px-3"
              >
                {savingConfig ? "保存中..." : "确认保存"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {fetchingModels && (
        <div className="flex items-center justify-center py-12 gap-2 animate-fade-in">
          <span
            className="inline-block w-5 h-5 rounded-full border-2"
            style={{
              borderColor: "var(--accent)",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ color: "var(--text-muted)" }} className="text-sm">
            正在获取模型列表...
          </span>
        </div>
      )}

      {/* Empty */}
      {!fetchingModels && config && models.length === 0 && !error && (
        <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
          请选择厂商、输入 API Key 后点击「获取模型列表」
        </div>
      )}

      {models.length > 0 && (
        <>
          {/* Action bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-slide-up">
            <span className="text-sm flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              共 <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>{models.length}</span> 个模型
              {config?.provider && config.provider !== "openai" && (
                <span className="badge badge-accent">
                  {PROVIDER_LABELS[config.provider]}
                </span>
              )}
            </span>
            <div className="flex gap-2">
              {tested > 0 && (
                <button
                  onClick={handleCopyMarkdown}
                  className="btn-ghost text-sm"
                >
                  {copied ? "已复制 ✓" : "复制为 Markdown"}
                </button>
              )}
              <button
                onClick={handleTestAll}
                disabled={testingAll}
                className="btn-success text-sm"
              >
                {testingAll ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-4 h-4 rounded-full border-2"
                      style={{
                        borderColor: "var(--text-inverse)",
                        borderTopColor: "transparent",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    检测中...
                  </span>
                ) : (
                  "全部检测"
                )}
              </button>
            </div>
          </div>

          <ProgressBar
            total={models.length}
            tested={tested}
            success={success}
            failed={failed}
          />

          <ModelTable
            models={models}
            results={results}
            onRetestOne={testOne}
          />
        </>
      )}
    </main>
  );
}

// ---------- 导出页面（Suspense 包裹，满足 useSearchParams 要求） ----------

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-24 gap-2">
            <span
              className="inline-block w-5 h-5 rounded-full border-2"
              style={{
                borderColor: "var(--accent)",
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span style={{ color: "var(--text-muted)" }} className="text-sm">
              加载中...
            </span>
          </div>
        </main>
      }
    >
      <HomeInner />
    </Suspense>
  );
}
