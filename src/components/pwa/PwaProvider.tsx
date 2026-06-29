"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { InstallPrompt } from "./InstallPrompt";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider swUrl="/serwist/sw.js" reloadOnOnline>
      {children}
      <InstallPrompt />
    </SerwistProvider>
  );
}
