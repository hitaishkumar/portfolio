"use client";

import * as React from "react";
import dynamic from "next/dynamic";

// loader is client-only and off the critical path
const GlobalLoader = dynamic(
  () => import("@/components/motion/global-loader").then((m) => m.GlobalLoader),
  { ssr: false }
);

type LoadingCtx = {
  /** Show the loader until it finishes its boot sequence (preview). */
  preview: () => void;
  visible: boolean;
};

const Ctx = React.createContext<LoadingCtx | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(false);

  // The loader is a showcase piece, surfaced only via the navbar toggle — it
  // never auto-appears for visitors on the live site.
  const preview = React.useCallback(() => setVisible(true), []);
  const hide = React.useCallback(() => setVisible(false), []);

  const value = React.useMemo(() => ({ preview, visible }), [preview, visible]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {visible && <GlobalLoader onDone={hide} />}
    </Ctx.Provider>
  );
}

export function useLoading(): LoadingCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useLoading must be used within <LoadingProvider>");
  return ctx;
}
