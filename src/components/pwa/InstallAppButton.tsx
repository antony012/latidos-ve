"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  onInstallPromptReady,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/install-prompt-store";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    const existing = getDeferredInstallPrompt();
    if (existing) setPrompt(existing);

    return onInstallPromptReady(() => {
      const next = getDeferredInstallPrompt();
      if (next) setPrompt(next);
    });
  }, []);

  if (!prompt || isStandalone()) return null;

  const handleInstall = async () => {
    const active = prompt ?? getDeferredInstallPrompt();
    if (!active) return;
    try {
      await active.prompt();
      await active.userChoice;
    } finally {
      clearDeferredInstallPrompt();
      setPrompt(null);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="inline-flex gap-1.5"
      onClick={() => void handleInstall()}
    >
      <Download className="size-4" />
      <span className="hidden sm:inline">Instalar</span>
    </Button>
  );
}
