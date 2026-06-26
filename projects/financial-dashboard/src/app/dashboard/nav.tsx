"use client";

import { createAuthClient } from "better-auth/client";
import { useRouter } from "next/navigation";

const authClient = createAuthClient();

export function DashboardNav() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="flex items-center gap-4">
      <button
        onClick={handleSignOut}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        Sign Out
      </button>
    </nav>
  );
}
