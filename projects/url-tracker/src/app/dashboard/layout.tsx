"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { FolderSidebar } from "./folder-sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await authClient.signOut();
    queryClient.clear(); // clear cached data so next user's data isn't visible
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b" style={{ background: 'var(--bg)', borderColor: 'var(--color-border)' }}>
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-md p-1.5 lg:hidden"
              style={{ color: 'var(--color-text-secondary)' }}
              aria-label="Toggle sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                {sidebarOpen ? (
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                ) : (
                  <>
                    <path d="M3 5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
            <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: 'var(--color-accent-subtle)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--color-accent)' }} />
                  <path d="M4 4h4M4 6h4M4 8h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" style={{ color: 'var(--color-accent)' }} />
                </svg>
              </span>
              Url Tracker
            </Link>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md px-3 py-1.5 text-sm transition-colors"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-10 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-10 mt-14 w-64 transform border-r p-3 transition-transform duration-200 lg:static lg:mt-0 lg:w-auto lg:translate-x-0 lg:border-r-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ background: 'var(--bg)', borderColor: 'var(--color-border)' }}
        >
          <FolderSidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6" style={{ background: 'var(--bg)' }}>{children}</main>
      </div>
    </div>
  );
}
