import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  // Backstop for the auto-reject guarantee; counter-page loads also sweep.
  crons: [{ path: "/api/cron/auto-reject", schedule: "* * * * *" }],
};
