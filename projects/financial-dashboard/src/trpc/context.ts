import type { Db } from "@/server/db";

export interface Context {
  db: Db;
  userId: string | null;
}

export async function createTRPCContext(opts: { headers: Headers }): Promise<Context> {
  const { auth } = await import("@/auth");
  const { db } = await import("@/server/db");

  const session = await auth.api.getSession({ headers: opts.headers });

  return {
    db,
    userId: session?.user?.id ?? null,
  };
}

export type CreateTRPCContext = typeof createTRPCContext;
