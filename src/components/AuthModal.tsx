"use client";

import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const fn = mode === "login" ? login : register;
    const err = await fn(email, password);

    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      setEmail("");
      setPassword("");
      onClose();
    }
  };

  const toggle = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  // OAuth 登录处理
  const handleOAuthLogin = (provider: "github" | "linuxdo") => {
    setError("");
    // 重定向到 OAuth 入口
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center glass-overlay animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-card-glow w-full max-w-sm mx-4 p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {mode === "login" ? "登录" : "注册"}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="input-dark w-full"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="至少 6 位"
              className="input-dark w-full"
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="text-sm text-center py-2 px-3 rounded-md animate-fade-in"
              style={{
                color: "var(--error)",
                background: "var(--error-muted)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-accent w-full py-2.5"
          >
            {submitting
              ? "请稍候..."
              : mode === "login"
                ? "登录"
                : "注册"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }}></div>
          <span
            className="px-3 text-sm"
            style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}
          >
            或使用第三方登录
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }}></div>
        </div>

        {/* OAuth Buttons */}
        <div className="flex gap-3">
          {/* GitHub */}
          <button
            type="button"
            onClick={() => handleOAuthLogin("github")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md transition-all hover:scale-105"
            style={{
              background: "#24292e",
              border: "1px solid #30363d",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#30363d";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#24292e";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7-.59.09-1.22-.16-2.06-.5A3.5 3.5 0 0 1 8 6.5c0 .54.08 1.07.16 1.59.25l3.03 3.03c.46.46.45.45 1.19-.03 1.64l-2.5 2.5c-.46.46-1.18.48-1.64.03A7.98 7.98 0 0 1 8 16Z" />
            </svg>
            <span className="text-sm font-medium">GitHub</span>
          </button>

          {/* LinuxDo */}
          <button
            type="button"
            onClick={() => handleOAuthLogin("linuxdo")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md transition-all hover:scale-105"
            style={{
              background: "#0a0a0a",
              border: "1px solid #333",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1a1a1a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0a0a0a";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
            </svg>
            <span className="text-sm font-medium">LinuxDo</span>
          </button>
        </div>

        {/* Toggle */}
        <p
          className="mt-5 text-center text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          {mode === "login" ? "没有账号？" : "已有账号？"}
          <button
            onClick={toggle}
            className="ml-1 font-medium transition-colors"
            style={{ color: "var(--accent)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--accent)";
            }}
          >
            {mode === "login" ? "去注册" : "去登录"}
          </button>
        </p>
      </div>
    </div>
  );
}
