import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Prefix a root-absolute public asset path (e.g. "/logos/x.svg") with the
 * deploy base path. Needed for raw <img>/<a> tags on a GitHub Pages project
 * site served from /<repo>/ — unlike next/link & next/image, these are NOT
 * auto-prefixed. NEXT_PUBLIC_BASE_PATH is inlined at build time.
 */
export function withBasePath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!base) return path;
  if (!path.startsWith("/")) return path; // external or relative, leave as-is
  return `${base}${path}`;
}
