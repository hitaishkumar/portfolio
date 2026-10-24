"use client";

import * as React from "react";

/**
 * Education logo badge: shows the school's logo image when available, and
 * gracefully falls back to a monogram badge if no logo is set OR the image
 * fails to load (e.g. the file hasn't been dropped into /public yet).
 */
export function EduLogo({
  logo,
  monogram,
  alt,
}: {
  logo?: string;
  monogram: string;
  alt: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const showImg = logo && !failed;

  if (showImg) {
    return (
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background">
      <span className="font-mono text-[9px] font-bold tracking-tight text-foreground">
        {monogram}
      </span>
    </div>
  );
}
