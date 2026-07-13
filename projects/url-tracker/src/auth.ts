import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./server/db";
import * as schema from "./server/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    /** Session expires after 30 days */
    expiresIn: 60 * 60 * 24 * 30,
    /** Update the session in the database every hour to keep it alive */
    updateAge: 60 * 60,
    /** Session is considered "fresh" for 24 hours before re-validation */
    freshAge: 60 * 60 * 24,
  },
  /** Dynamic base URL so it works on any localhost port in development */
  baseURL: {
    allowedHosts: ["localhost:3000", "localhost:*", "127.0.0.1:*"],
    fallback: "http://localhost:3000",
  },
});
