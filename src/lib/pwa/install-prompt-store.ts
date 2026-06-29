export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __LATIDOS_DEFERRED_INSTALL__?: BeforeInstallPromptEvent | null;
  }
}

const READY_EVENT = "latidosve:install-prompt-ready";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenerAttached = false;

function readWindowPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  return window.__LATIDOS_DEFERRED_INSTALL__ ?? null;
}

function attachEarlyListener() {
  if (listenerAttached || typeof window === "undefined") return;
  listenerAttached = true;

  const existing = readWindowPrompt();
  if (existing) deferredPrompt = existing;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    window.__LATIDOS_DEFERRED_INSTALL__ = deferredPrompt;
    window.dispatchEvent(new CustomEvent(READY_EVENT));
  });
}

attachEarlyListener();

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  attachEarlyListener();
  return deferredPrompt ?? readWindowPrompt();
}

export function clearDeferredInstallPrompt(): void {
  deferredPrompt = null;
  if (typeof window !== "undefined") {
    window.__LATIDOS_DEFERRED_INSTALL__ = null;
  }
}

export function onInstallPromptReady(listener: () => void): () => void {
  attachEarlyListener();
  if (deferredPrompt) listener();
  window.addEventListener(READY_EVENT, listener);
  return () => window.removeEventListener(READY_EVENT, listener);
}
