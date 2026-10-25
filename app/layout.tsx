import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { profile } from "@/lib/data";
import { ThemeProvider } from "@/components/theme-provider";
import { LoadingProvider } from "@/components/loading-provider";
import { THEMES, DEFAULT_THEME_ID, themeToCssVars } from "@/lib/themes";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hitaishkumar.dev"),
  title: `${profile.name} — ${profile.tagline}`,
  description: profile.summary,
  keywords: [
    "Hitaish Kumar",
    "Backend Engineer",
    "Distributed Systems",
    "Go",
    "Golang",
    "Software Engineer",
    "Event-Driven Architecture",
  ],
  authors: [{ name: profile.name }],
  openGraph: {
    title: `${profile.name} — ${profile.tagline}`,
    description: profile.summary,
    type: "website",
    locale: "en_US",
    siteName: profile.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${profile.name} — ${profile.tagline}`,
    description: profile.summary,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Embed a compact { id: {cssVar: value} } map + modes so the no-flash script
  // can apply the persisted (or default) theme before first paint.
  const themeVars: Record<string, Record<string, string>> = {};
  const themeModes: Record<string, string> = {};
  for (const t of THEMES) {
    themeVars[t.id] = themeToCssVars(t.tokens);
    themeModes[t.id] = t.mode;
  }
  const noFlash = `(function(){try{
    var V=${JSON.stringify(themeVars)},M=${JSON.stringify(themeModes)},D=${JSON.stringify(
      DEFAULT_THEME_ID
    )};
    var id=null;try{id=localStorage.getItem('portfolio-theme');}catch(e){}
    if(!id||!V[id])id=D;
    var r=document.documentElement,vars=V[id];
    for(var k in vars)r.style.setProperty(k,vars[k]);
    r.dataset.theme=id;r.dataset.mode=M[id];
    if(M[id]==='dark')r.classList.add('dark');
  }catch(e){}})();`;

  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME_ID}
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <ThemeProvider>
          <LoadingProvider>{children}</LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
