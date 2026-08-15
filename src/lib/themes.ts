/**
 * Curated site templates (PLAN.md §5.2): a small set of hand-crafted looks.
 * AI selects among these and sets the accent; it never invents layouts.
 */
export type ThemeId = "classic" | "bistro" | "bold";

export type Theme = {
  id: ThemeId;
  name: string;
  /** CSS custom properties applied on the tenant site root. */
  vars: Record<string, string>;
  headingFont: "serif" | "sans";
  dark: boolean;
};

export const THEMES: Record<ThemeId, Theme> = {
  classic: {
    id: "classic",
    name: "Classic",
    headingFont: "serif",
    dark: false,
    vars: {
      "--t-bg": "#faf7f2",
      "--t-fg": "#1f1a15",
      "--t-card": "#ffffff",
      "--t-muted": "#6f665c",
      "--t-line": "#e7e0d6",
    },
  },
  bistro: {
    id: "bistro",
    name: "Bistro",
    headingFont: "serif",
    dark: true,
    vars: {
      "--t-bg": "#16130f",
      "--t-fg": "#f3ede4",
      "--t-card": "#211d17",
      "--t-muted": "#a89e90",
      "--t-line": "#332d24",
    },
  },
  bold: {
    id: "bold",
    name: "Bold",
    headingFont: "sans",
    dark: false,
    vars: {
      "--t-bg": "#fffdf5",
      "--t-fg": "#141414",
      "--t-card": "#ffffff",
      "--t-muted": "#5c5c5c",
      "--t-line": "#ebe6d8",
    },
  },
};

export function themeFor(id: string): Theme {
  return THEMES[(id as ThemeId) in THEMES ? (id as ThemeId) : "classic"];
}
