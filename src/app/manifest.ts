import type { MetadataRoute } from "next";

/** Installable counter-tablet PWA (PLAN.md §1) — owners install from /counter. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Restaurant Counter",
    short_name: "Counter",
    description: "Incoming pickup orders, 86 board, and ordering controls.",
    start_url: "/counter",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
