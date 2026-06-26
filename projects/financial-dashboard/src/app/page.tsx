"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="flex max-w-2xl flex-col items-center gap-8 px-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight">Financial Dashboard</h1>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Real-time market data and analysis for stocks, ETFs, and funds.
        </p>
        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
          {!isPending && !session && (
            <Link
              href="/login"
              className="rounded-lg border px-6 py-3 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Sign In
            </Link>
          )}
          {session && (
            <span className="rounded-lg border px-6 py-3 text-sm font-medium">
              Signed in as {session.user.name}
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
