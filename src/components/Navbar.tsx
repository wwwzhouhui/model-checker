"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";
import AuthModal from "./AuthModal";

const NAV_LINKS = [
  { href: "/", label: "模型检测" },
  { href: "/dashboard", label: "我的配置" },
  { href: "/history", label: "检测历史" },
];

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const pathname = usePathname();

  const initial = user?.email?.charAt(0).toUpperCase() ?? "?";

  return (
    <>
      <nav className="glass-card" style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none", borderBottom: "1px solid var(--border)", position: "relative" }}>
        {/* Bottom glow line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%)",
            opacity: 0.3,
          }}
        />
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between relative">
          {/* Left: Brand + Nav Links */}
          <div className="flex items-center gap-1">
            {/* Brand */}
            <a
              href="/"
              className="font-mono font-bold text-base tracking-tight mr-4 flex items-center gap-2"
              style={{ color: "var(--text-primary)" }}
            >
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--success))",
                  color: "var(--text-inverse)",
                }}
              >
                MC
              </span>
              <span>
                Model<span style={{ color: "var(--accent)" }}>Checker</span>
              </span>
            </a>

            {/* Nav Links (visible to logged-in users, except home which is always visible) */}
            {NAV_LINKS.map((link) => {
              // Only show dashboard/history to logged-in users
              if (link.href !== "/" && !user) return null;

              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                  style={{
                    color: isActive ? "var(--accent)" : "var(--text-secondary)",
                    background: isActive ? "var(--accent-muted)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.background = "rgba(55, 65, 81, 0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {link.label}
                </a>
              );
            })}
          </div>

          {/* Right: User / Auth */}
          <div className="flex items-center gap-3">
            {loading ? (
              <span
                className="inline-block w-4 h-4 rounded-full border-2"
                style={{
                  borderColor: "var(--accent)",
                  borderTopColor: "transparent",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            ) : user ? (
              <div className="flex items-center gap-3">
                {/* User badge */}
                <div className="flex items-center gap-2">
                  {/* Avatar or fallback */}
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className="w-7 h-7 rounded-full object-cover"
                      style={{ border: "1px solid var(--border)" }}
                    />
                  ) : (
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                      style={{
                        background: "var(--accent-muted)",
                        color: "var(--accent)",
                        border: "1px solid rgba(6, 182, 212, 0.3)",
                      }}
                    >
                      {user.email?.charAt(0).toUpperCase() ?? "?"}
                    </span>
                  )}
                  {/* Display name or email */}
                  <span
                    className="text-sm hidden sm:inline max-w-[120px] truncate"
                    style={{ color: "var(--text-secondary)" }}
                    title={user.email || user.username || undefined}
                  >
                    {user.username || user.email}
                  </span>
                  {/* OAuth provider badge */}
                  {user.oauthProvider && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: "var(--bg-tertiary)",
                        color: "var(--text-muted)",
                        fontSize: "10px",
                      }}
                    >
                      {user.oauthProvider === "github" ? "GitHub" : "LinuxDo"}
                    </span>
                  )}
                </div>
                {/* Logout */}
                <button
                  onClick={logout}
                  className="text-sm px-2.5 py-1 rounded-md transition-colors"
                  style={{
                    color: "var(--text-muted)",
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--error)";
                    e.currentTarget.style.background = "var(--error-muted)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  退出
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="btn-accent text-sm"
              >
                登录 / 注册
              </button>
            )}
          </div>
        </div>
      </nav>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
