# Hitaish Kumar — Portfolio

A clean, minimalist developer portfolio built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**. Dark mode by default, fully responsive, SEO-ready, and deployable to Vercel, Netlify, or GitHub Pages with zero or minimal config.

## Tech stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS with shadcn/ui design tokens
- `next-themes` for light/dark mode
- `lucide-react` icons, Geist font

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build   # production build
npm start       # serve the production build
```

## Editing your content

All text lives in one file — **`lib/data.ts`**. Update your summary, skills, experience, projects, and links there. No need to touch the components.

**Before publishing, verify these in `lib/data.ts`:**

- `linkedin` and `github` URLs (currently use the `davythedev` handle)
- `email`, `phone`, and `location`

### Resume PDF

The "Resume" button links to `/Hitaish_Kumar_Resume.pdf` in the `public/` folder. A compiled copy is already included. To regenerate from your Typst source:

```bash
typst compile Hitaish_Kumar_SDE2.typ public/Hitaish_Kumar_Resume.pdf
```

Or just drop any PDF into `public/` with that filename.

## Deployment

### Option 1 — Vercel (recommended, easiest)

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Accept the defaults (Vercel auto-detects Next.js) and click **Deploy**.

No configuration needed. Every push to `main` redeploys automatically.

### Option 2 — Netlify

The included `netlify.toml` configures a static export build.

1. Push to GitHub.
2. On [netlify.com](https://app.netlify.com), "Add new site" → "Import an existing project".
3. Netlify reads `netlify.toml` automatically (`STATIC_EXPORT=true npm run build`, publish `out`). Click **Deploy**.

### Option 3 — GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds a static export and publishes it.

1. Push to GitHub (branch `main`).
2. Repo **Settings → Pages → Source → GitHub Actions**.
3. If your site is served from a subpath (`https://<user>.github.io/<repo>`), add a repo variable
   **Settings → Secrets and variables → Actions → Variables**: `BASE_PATH = /<repo>`.
   For a user/root site (`<user>.github.io`), leave `BASE_PATH` unset.
4. Push — the Action builds and deploys automatically.

### Any static host

```bash
STATIC_EXPORT=true npm run build
```

This outputs a fully static site to `out/` that you can upload anywhere (S3 + CloudFront, Cloudflare Pages, etc.).

## Project structure

```
app/
  layout.tsx        # metadata/SEO, fonts, theme provider
  page.tsx          # composes all sections
  globals.css       # design tokens + base styles
  icon.svg          # favicon
components/
  sections/         # hero, about, skills, experience, projects, contact
  ui/               # shadcn primitives (button, card, badge)
  theme-provider.tsx, theme-toggle.tsx
lib/
  data.ts           # ← all your content
  utils.ts          # cn() helper
public/             # resume PDF + static assets
```

## Security note

This build runs **Next.js 16.4.2**, which resolves the December 2025 `next` advisory — `npm audit` no longer reports any `next` or runtime vulnerabilities. The remaining audit warnings (`braces`, `postcss`, `postcss-selector-parser`) are build-time dev dependencies in the Tailwind/PostCSS toolchain and are not shipped in the static output.

Do not run `npm audit fix --force`: its suggested "fix" would downgrade `eslint-config-next` back to 14.x.
