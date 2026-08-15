import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type Db = ReturnType<typeof create>;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — provision Neon and run `vercel env pull`.");
  }
  return drizzle(neon(url), { schema });
}

let instance: Db | null = null;

// Lazy so builds without DATABASE_URL succeed; connects on first query.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    instance ??= create();
    return instance[prop as keyof Db];
  },
});

export * as tables from "./schema";
