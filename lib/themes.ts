/**
 * Curated theme catalog. Each theme is a coherent set of design tokens given
 * as HSL triplets ("H S% L%") — the same format the Tailwind CSS variables use.
 * A theme is applied by writing these onto :root as CSS custom properties, so
 * the whole site (and the token-reading sims) re-skins at once.
 */

export type ThemeMode = "light" | "dark";

/** Compact token set authored per theme; expanded to full CSS vars at apply. */
export type ThemeTokens = {
  bg: string; // background
  fg: string; // foreground
  card: string;
  cardFg: string;
  border: string;
  muted: string; // muted surface
  mutedFg: string; // muted text
  a1: string; // accent-1 (primary)
  a2: string; // accent-2
  a3: string; // accent-3
};

export type Theme = {
  id: string;
  name: string;
  mode: ThemeMode;
  tokens: ThemeTokens;
};

/** Expand compact tokens into the full set of CSS variables Tailwind expects. */
export function themeToCssVars(t: ThemeTokens): Record<string, string> {
  return {
    "--background": t.bg,
    "--foreground": t.fg,
    "--card": t.card,
    "--card-foreground": t.cardFg,
    "--popover": t.card,
    "--popover-foreground": t.cardFg,
    "--primary": t.a1,
    "--primary-foreground": t.bg,
    "--secondary": t.muted,
    "--secondary-foreground": t.fg,
    "--muted": t.muted,
    "--muted-foreground": t.mutedFg,
    "--accent": t.muted,
    "--accent-foreground": t.fg,
    "--border": t.border,
    "--input": t.border,
    "--ring": t.a1,
    "--accent-1": t.a1,
    "--accent-2": t.a2,
    "--accent-3": t.a3,
  };
}

/* ------------------------------------------------------------------ *
 * LIGHT THEMES (25)
 * ------------------------------------------------------------------ */
const LIGHT: Theme[] = [
  mk("indigo-breeze", "Indigo Breeze", "light", "0 0% 100%", "240 10% 4%", "240 6% 90%", "240 5% 96%", "240 4% 40%", "243 75% 59%", "199 89% 48%", "271 81% 56%"),
  mk("rose-pine-dawn", "Rosé Pine Dawn", "light", "32 57% 95%", "25 20% 23%", "25 20% 83%", "32 44% 90%", "25 12% 45%", "268 21% 57%", "189 30% 48%", "343 35% 55%"),
  mk("solarized-light", "Solarized Light", "light", "44 87% 94%", "192 81% 14%", "46 42% 82%", "44 55% 88%", "194 14% 40%", "205 69% 49%", "175 59% 40%", "331 64% 52%"),
  mk("github-light", "GitHub Light", "light", "0 0% 100%", "215 21% 11%", "210 18% 87%", "210 17% 95%", "215 14% 42%", "212 92% 45%", "134 61% 34%", "258 68% 58%"),
  mk("catppuccin-latte", "Catppuccin Latte", "light", "220 23% 95%", "234 16% 35%", "223 16% 83%", "220 22% 92%", "233 10% 47%", "220 91% 54%", "183 74% 35%", "266 85% 58%"),
  mk("everforest-light", "Everforest Light", "light", "44 46% 92%", "90 10% 29%", "45 24% 82%", "44 35% 88%", "90 8% 42%", "142 35% 42%", "38 61% 49%", "6 54% 55%"),
  mk("gruvbox-light", "Gruvbox Light", "light", "44 87% 92%", "20 11% 19%", "43 30% 80%", "44 50% 87%", "22 9% 41%", "122 40% 35%", "37 85% 42%", "352 60% 48%"),
  mk("nord-light", "Nord Light", "light", "218 27% 94%", "220 16% 22%", "219 20% 85%", "219 24% 90%", "220 10% 45%", "213 32% 52%", "179 25% 45%", "311 20% 56%"),
  mk("one-light", "One Light", "light", "230 1% 98%", "230 8% 24%", "230 10% 88%", "230 6% 94%", "230 6% 44%", "221 87% 54%", "173 62% 40%", "286 60% 57%"),
  mk("ayu-light", "Ayu Light", "light", "40 100% 98%", "210 13% 23%", "40 20% 86%", "40 60% 94%", "210 9% 46%", "35 100% 50%", "190 70% 45%", "260 60% 60%"),
  mk("tokyo-light", "Tokyo Day", "light", "220 23% 95%", "228 20% 28%", "220 16% 85%", "220 20% 91%", "228 10% 46%", "220 72% 52%", "189 60% 42%", "267 57% 58%"),
  mk("paper", "Paper", "light", "48 30% 96%", "0 0% 15%", "48 12% 85%", "48 20% 91%", "0 0% 42%", "217 60% 48%", "160 45% 40%", "12 70% 52%"),
  mk("sand", "Sand", "light", "36 33% 92%", "28 18% 20%", "34 20% 82%", "36 26% 88%", "28 10% 42%", "20 70% 48%", "160 40% 40%", "255 45% 58%"),
  mk("mint-cream", "Mint Cream", "light", "150 40% 96%", "170 20% 18%", "150 20% 85%", "150 30% 92%", "170 10% 42%", "168 70% 36%", "200 70% 45%", "280 50% 56%"),
  mk("sakura", "Sakura", "light", "340 60% 97%", "330 18% 24%", "340 30% 90%", "340 45% 94%", "330 12% 46%", "335 70% 58%", "260 55% 60%", "190 55% 46%"),
  mk("sky", "Sky", "light", "205 60% 97%", "212 30% 22%", "205 30% 88%", "205 45% 93%", "212 12% 44%", "205 85% 48%", "255 60% 60%", "170 55% 42%"),
  mk("linen", "Linen", "light", "30 25% 94%", "24 12% 22%", "30 14% 84%", "30 18% 90%", "24 8% 44%", "195 55% 42%", "25 65% 50%", "280 40% 56%"),
  mk("lavender-light", "Lavender", "light", "265 50% 97%", "270 20% 25%", "265 28% 90%", "265 40% 94%", "270 10% 46%", "265 70% 60%", "315 60% 58%", "200 60% 48%"),
  mk("sage", "Sage", "light", "100 18% 93%", "110 15% 22%", "100 12% 83%", "100 14% 89%", "110 8% 42%", "140 40% 38%", "80 50% 42%", "200 50% 46%"),
  mk("peach", "Peach", "light", "22 90% 96%", "18 25% 24%", "22 45% 88%", "22 70% 93%", "18 14% 46%", "14 85% 56%", "340 70% 58%", "40 85% 48%"),
  mk("ice", "Ice", "light", "200 40% 97%", "210 25% 24%", "200 24% 89%", "200 34% 93%", "210 10% 46%", "195 80% 44%", "225 65% 58%", "165 55% 42%"),
  mk("porcelain", "Porcelain", "light", "210 20% 98%", "215 25% 18%", "210 16% 89%", "210 18% 94%", "215 10% 44%", "243 70% 58%", "199 80% 46%", "271 70% 56%"),
  mk("honey", "Honey", "light", "45 90% 95%", "35 30% 22%", "45 45% 85%", "45 70% 91%", "35 14% 44%", "40 90% 48%", "25 80% 52%", "160 45% 40%"),
  mk("fjord-light", "Fjord Light", "light", "205 30% 94%", "210 25% 22%", "205 18% 85%", "205 24% 90%", "210 10% 44%", "210 60% 46%", "188 55% 42%", "250 50% 58%"),
  mk("blossom", "Blossom", "light", "320 45% 97%", "315 20% 24%", "320 26% 90%", "320 38% 94%", "315 12% 46%", "320 65% 58%", "275 55% 60%", "180 55% 44%"),
];

/* ------------------------------------------------------------------ *
 * DARK THEMES (25)
 * ------------------------------------------------------------------ */
const DARK: Theme[] = [
  mk("midnight-indigo", "Midnight Indigo", "dark", "240 10% 6%", "0 0% 96%", "240 6% 18%", "240 8% 12%", "240 5% 62%", "243 80% 68%", "199 89% 58%", "271 81% 66%"),
  mk("dracula", "Dracula", "dark", "231 15% 18%", "60 30% 96%", "232 14% 31%", "232 14% 22%", "225 14% 70%", "265 89% 78%", "191 97% 77%", "326 100% 74%"),
  mk("nord", "Nord", "dark", "220 16% 22%", "218 27% 92%", "220 13% 35%", "220 16% 28%", "219 18% 72%", "213 32% 62%", "179 25% 55%", "311 20% 66%"),
  mk("tokyo-night", "Tokyo Night", "dark", "235 19% 15%", "229 35% 86%", "234 15% 29%", "235 17% 20%", "228 18% 68%", "221 83% 70%", "189 70% 60%", "267 84% 74%"),
  mk("catppuccin-mocha", "Catppuccin Mocha", "dark", "240 21% 15%", "226 64% 88%", "237 16% 30%", "240 19% 20%", "228 24% 72%", "217 92% 76%", "189 71% 73%", "267 84% 81%"),
  mk("gruvbox-dark", "Gruvbox Dark", "dark", "20 7% 15%", "43 46% 86%", "22 8% 30%", "20 7% 21%", "40 20% 68%", "61 66% 44%", "24 85% 58%", "6 80% 64%"),
  mk("solarized-dark", "Solarized Dark", "dark", "192 100% 11%", "44 54% 83%", "193 50% 22%", "192 81% 15%", "194 18% 60%", "205 69% 55%", "175 59% 48%", "331 64% 58%"),
  mk("one-dark", "One Dark", "dark", "220 13% 18%", "220 14% 83%", "220 11% 32%", "220 13% 24%", "220 10% 66%", "207 82% 66%", "173 62% 52%", "286 60% 67%"),
  mk("monokai", "Monokai", "dark", "70 8% 15%", "60 30% 92%", "70 6% 30%", "70 8% 21%", "60 10% 66%", "81 74% 54%", "190 81% 67%", "326 100% 74%"),
  mk("everforest-dark", "Everforest Dark", "dark", "150 10% 15%", "40 26% 84%", "150 8% 30%", "150 10% 21%", "90 10% 64%", "142 32% 56%", "38 61% 62%", "6 54% 66%"),
  mk("rose-pine", "Rosé Pine", "dark", "249 22% 15%", "245 50% 91%", "248 15% 32%", "249 20% 21%", "245 18% 70%", "267 57% 78%", "189 43% 63%", "343 76% 68%"),
  mk("ayu-dark", "Ayu Mirage", "dark", "213 23% 18%", "210 20% 85%", "213 16% 32%", "213 22% 24%", "210 12% 66%", "35 100% 62%", "190 70% 58%", "260 70% 72%"),
  mk("ayu-mirage", "Ayu Dark", "dark", "220 27% 12%", "210 18% 84%", "220 17% 28%", "220 26% 18%", "210 11% 64%", "40 100% 60%", "200 80% 58%", "275 70% 72%"),
  mk("night-owl", "Night Owl", "dark", "207 95% 8%", "210 44% 90%", "207 40% 22%", "207 70% 13%", "210 20% 68%", "198 90% 66%", "140 60% 56%", "291 70% 72%"),
  mk("palenight", "Palenight", "dark", "229 20% 20%", "226 40% 88%", "229 16% 34%", "229 19% 26%", "226 16% 70%", "221 83% 72%", "174 60% 58%", "285 65% 74%"),
  mk("synthwave", "Synthwave", "dark", "260 40% 12%", "300 30% 92%", "260 30% 28%", "260 38% 18%", "280 25% 72%", "320 90% 66%", "190 95% 60%", "265 90% 72%"),
  mk("cyberpunk", "Cyberpunk", "dark", "260 30% 8%", "60 80% 88%", "280 40% 24%", "265 35% 14%", "280 20% 66%", "320 100% 62%", "180 100% 50%", "54 100% 60%"),
  mk("matrix", "Matrix", "dark", "140 20% 7%", "120 40% 85%", "140 18% 22%", "140 20% 12%", "120 16% 60%", "135 80% 50%", "90 70% 55%", "160 70% 50%"),
  mk("deep-ocean", "Deep Ocean", "dark", "215 40% 10%", "205 35% 88%", "215 30% 24%", "215 38% 15%", "205 18% 66%", "200 90% 58%", "255 70% 70%", "170 70% 50%"),
  mk("espresso", "Espresso", "dark", "25 20% 12%", "32 30% 86%", "25 16% 28%", "25 20% 18%", "32 14% 64%", "28 80% 58%", "160 45% 52%", "350 65% 64%"),
  mk("obsidian", "Obsidian", "dark", "220 14% 10%", "210 16% 88%", "220 10% 26%", "220 13% 16%", "210 10% 62%", "243 80% 70%", "199 85% 60%", "271 80% 70%"),
  mk("forest-night", "Forest Night", "dark", "155 25% 10%", "100 22% 86%", "155 18% 26%", "155 24% 15%", "100 12% 62%", "140 50% 52%", "80 55% 56%", "190 60% 54%"),
  mk("plum", "Plum", "dark", "290 25% 12%", "300 25% 88%", "290 20% 28%", "290 24% 18%", "300 14% 66%", "300 65% 66%", "255 65% 70%", "180 60% 52%"),
  mk("carbon", "Carbon", "dark", "220 6% 12%", "210 12% 88%", "220 5% 28%", "220 6% 17%", "210 8% 62%", "210 90% 62%", "160 60% 52%", "35 90% 60%"),
  mk("ember", "Ember", "dark", "15 25% 10%", "25 35% 88%", "15 18% 26%", "15 24% 15%", "25 16% 64%", "16 90% 58%", "40 95% 56%", "345 75% 62%"),
];

function mk(
  id: string,
  name: string,
  mode: ThemeMode,
  bg: string,
  fg: string,
  border: string,
  muted: string,
  mutedFg: string,
  a1: string,
  a2: string,
  a3: string
): Theme {
  // card is a hair lighter (light mode) / lighter (dark mode) than bg; derive
  // card foreground = fg. Keep it simple and coherent.
  return {
    id,
    name,
    mode,
    tokens: {
      bg,
      fg,
      card: mode === "dark" ? lighten(bg, 4) : bg,
      cardFg: fg,
      border,
      muted,
      mutedFg,
      a1,
      a2,
      a3,
    },
  };
}

/** Nudge the L of an "H S% L%" triplet by `delta` percentage points. */
function lighten(triplet: string, delta: number): string {
  const m = triplet.match(/^(\d+)\s+(\d+)%\s+(\d+)%$/);
  if (!m) return triplet;
  const h = m[1];
  const s = m[2];
  const l = Math.max(0, Math.min(100, parseInt(m[3], 10) + delta));
  return `${h} ${s}% ${l}%`;
}

export const THEMES: Theme[] = [...LIGHT, ...DARK];
export const LIGHT_THEMES = LIGHT;
export const DARK_THEMES = DARK;

/** The default theme shipped on first load / deployment. */
export const DEFAULT_THEME_ID = "indigo-breeze";

export function getTheme(id: string): Theme | undefined {
  return THEMES.find((t) => t.id === id);
}
