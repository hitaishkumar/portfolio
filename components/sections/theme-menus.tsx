"use client";

import * as React from "react";
import { Check, ChevronDown, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { LIGHT_THEMES, DARK_THEMES, type Theme } from "@/lib/themes";

/**
 * Two theme dropdowns in the navbar — one for light themes, one for dark.
 * The active theme is simply whichever option was last picked from either menu
 * (model "a"). Selection persists and re-skins the whole site + sims.
 */
export function ThemeMenus() {
  return (
    <div className="flex items-center gap-1">
      <ThemeDropdown
        label="Light"
        icon={<Sun className="h-3.5 w-3.5" />}
        themes={LIGHT_THEMES}
      />
      <ThemeDropdown
        label="Dark"
        icon={<Moon className="h-3.5 w-3.5" />}
        themes={DARK_THEMES}
      />
    </div>
  );
}

function ThemeDropdown({
  label,
  icon,
  themes,
}: {
  label: string;
  icon: React.ReactNode;
  themes: Theme[];
}) {
  const { themeId, setThemeId } = useTheme();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const activeHere = themes.some((t) => t.id === themeId);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
          activeHere
            ? "border-accent-1/50 bg-accent-1/10 text-foreground"
            : "border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        {icon}
        {label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 max-h-80 w-52 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {themes.map((t) => {
            const selected = t.id === themeId;
            return (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setThemeId(t.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                  selected
                    ? "bg-accent-1/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Swatch theme={t} />
                  {t.name}
                </span>
                {selected && <Check className="h-3.5 w-3.5 text-accent-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Tiny three-dot accent preview for a theme. */
function Swatch({ theme }: { theme: Theme }) {
  const { tokens } = theme;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[tokens.a1, tokens.a2, tokens.a3].map((c, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-full ring-1 ring-black/5"
          style={{ backgroundColor: `hsl(${c})` }}
        />
      ))}
    </span>
  );
}
