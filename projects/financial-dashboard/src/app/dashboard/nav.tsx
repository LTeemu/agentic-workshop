"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { authClient } from "@/lib/auth-client";

export function DashboardNav() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  async function handleSignOut() {
    await authClient.signOut();
    // Clear stale user-specific caches before leaving dashboard
    queryClient.invalidateQueries({ queryKey: trpc.stocks.getTracked.queryKey() });
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
