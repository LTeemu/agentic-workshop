"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createAuthClient } from "better-auth/client";

const authClient = createAuthClient();

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await authClient.signIn.email({ email, password });

    setLoading(false);

    if (signInError) {
      setError(signInError.message ?? "Invalid email or password");
      return;
    }

    queryClient.clear(); // ensure previous user's cached data isn't visible
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-5 p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
        {/* Logo / Header */}
        <div className="text-center">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Sign In</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Continue tracking your pages</p>
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg px-3 py-2.5 text-sm placeholder:opacity-40 focus:outline-none focus:ring-1"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-lg px-3 py-2.5 text-sm placeholder:opacity-40 focus:outline-none focus:ring-1"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ background: 'var(--color-accent)', color: '#0c0c0f', borderRadius: 'var(--radius-lg)' }}
          className="cursor-pointer w-full px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="hover:underline" style={{ color: 'var(--color-accent)' }}>Register</Link>
        </p>
      </form>
    </div>
  );
}
