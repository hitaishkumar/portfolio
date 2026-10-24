"use client";

import * as React from "react";
import { profile } from "@/lib/data";

const links = [
  { href: "#about", id: "about", label: "About" },
  { href: "#skills", id: "skills", label: "Skills" },
  { href: "#ai", id: "ai", label: "AI" },
  { href: "#experience", id: "experience", label: "Experience" },
  { href: "#projects", id: "projects", label: "Projects" },
  { href: "#contact", id: "contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [active, setActive] = React.useState<string>("");

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: the section whose top is just below the sticky header wins.
  React.useEffect(() => {
    const sections = links
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // pick the entry nearest the top of the viewport that is intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActive((visible[0].target as HTMLElement).id);
        }
      },
      {
        // trigger when a section crosses the band just under the 64px header
        rootMargin: "-64px 0px -55% 0px",
        threshold: 0,
      }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const activeLabel = links.find((l) => l.id === active)?.label;

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors ${
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <nav className="container flex h-16 items-center justify-between">
        <a
          href="#"
          className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight"
        >
          <span>
            {profile.name.split(" ")[0].toLowerCase()}
            <span className="text-muted-foreground">.dev</span>
          </span>
          {/* current section — shown on mobile where the link row is hidden */}
          {activeLabel && (
            <span className="text-muted-foreground md:hidden">
              <span className="mr-2 text-border">/</span>
              <span className="text-accent-1">{activeLabel.toLowerCase()}</span>
            </span>
          )}
        </a>
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const isActive = active === link.id;
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? "true" : undefined}
                className={`nav-underline rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "nav-active text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
