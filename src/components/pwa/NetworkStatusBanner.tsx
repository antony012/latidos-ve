"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { getCacheTimestamp } from "@/lib/offline/storage";

interface NetworkStatusBannerProps {
  message?: string;
}

export function NetworkStatusBanner({ message }: NetworkStatusBannerProps) {
  const isOnline = useOnlineStatus();

  if (isOnline && !message) return null;

  const cachedAt = getCacheTimestamp();

  return (
    <div
      role="alert"
      className="flex shrink-0 items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      {!isOnline && <WifiOff className="size-4 shrink-0" />}
      <span>
        {message ??
          (isOnline
            ? "Conexión restaurada"
            : `Sin conexión — mostrando datos guardados${cachedAt ? ` (${new Date(cachedAt).toLocaleString("es-VE")})` : ""}`)}
      </span>
    </div>
  );
}
