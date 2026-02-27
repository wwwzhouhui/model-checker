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
