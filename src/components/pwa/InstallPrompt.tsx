"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { APP_NAME } from "@/lib/constants/branding";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  onInstallPromptReady,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/install-prompt-store";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "latidosve:install-dismissed";
const DISMISS_DAYS = 7;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (Number.isNaN(ts)) return true;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

type PromptMode = "native" | "ios" | "android-manual";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<PromptMode>("native");

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    const existing = getDeferredInstallPrompt();
    if (existing) {
      setDeferredPrompt(existing);
      setMode("native");
      setVisible(true);
    }

    const unsubscribe = onInstallPromptReady(() => {
      const prompt = getDeferredInstallPrompt();
      if (!prompt) return;
      setDeferredPrompt(prompt);
      setMode("native");
      setVisible(true);
    });

    const fallbackTimer = window.setTimeout(() => {
      if (isStandalone() || isDismissed()) return;
      if (getDeferredInstallPrompt()) return;

      if (isIos()) {
        setMode("ios");
        setVisible(true);
        return;
      }

      if (isAndroid()) {
        setMode("android-manual");
        setVisible(true);
      }
    }, 3000);

    return () => {
      unsubscribe();
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPrompt ?? getDeferredInstallPrompt();
    if (!prompt) return;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      }
    } finally {
      clearDeferredInstallPrompt();
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    clearDeferredInstallPrompt();
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  const showNativeButton =
    mode === "native" && (deferredPrompt ?? getDeferredInstallPrompt());

  return (
    <div className="fixed inset-x-3 bottom-[4.75rem] z-[2000] rounded-xl border bg-background p-4 shadow-lg sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-sm md:bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          {mode === "native" ? (
            <Download className="size-5" />
          ) : (
            <Share className="size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Instalar {APP_NAME}</p>
          {mode === "ios" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              En Safari: toca <strong>Compartir</strong> abajo y luego{" "}
              <strong>Añadir a pantalla de inicio</strong>.
            </p>
          ) : mode === "android-manual" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              En Chrome: menú <strong>⋮</strong> arriba a la derecha →{" "}
              <strong>Instalar aplicación</strong> o{" "}
              <strong>Añadir a pantalla de inicio</strong>.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Accede al mapa y centros de acopio como app, incluso sin conexión
              estable.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {showNativeButton && (
              <Button size="sm" onClick={() => void handleInstall()}>
                Instalar app
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Ahora no
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
