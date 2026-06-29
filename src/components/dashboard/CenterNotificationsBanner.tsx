"use client";

import { useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCenterNotifications,
  markNotificationRead,
} from "@/lib/store/demo-store";
import { useStoreSync } from "@/hooks/use-store-sync";
import { cn } from "@/lib/utils";

interface CenterNotificationsBannerProps {
  centerId: string;
  className?: string;
}

export function CenterNotificationsBanner({
  centerId,
  className,
}: CenterNotificationsBannerProps) {
  useStoreSync();
  const notifications = getCenterNotifications(centerId);
  const unread = notifications.filter((n) => !n.read_at);

  if (notifications.length === 0) return null;

  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-violet-600" />
        <h2 className="text-sm font-semibold">
          Mensajes del coordinador nacional
          {unread.length > 0 && (
            <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-medium text-white">
              {unread.length} nuevo{unread.length !== 1 ? "s" : ""}
            </span>
          )}
        </h2>
      </div>
      <ul className="space-y-2">
        {notifications.slice(0, 5).map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </ul>
    </section>
  );
}

function NotificationItem({
  notification: n,
}: {
  notification: ReturnType<typeof getCenterNotifications>[number];
}) {
  const [dismissed, setDismissed] = useState(false);
  const unread = !n.read_at;

  if (dismissed) return null;

  const markRead = () => {
    if (unread) markNotificationRead(n.id);
    setDismissed(true);
  };

  return (
    <li
      className={cn(
        "relative rounded-xl border p-4 text-sm",
        unread
          ? "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40"
          : "border-muted bg-muted/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium leading-snug">{n.title}</p>
          <p className="text-muted-foreground whitespace-pre-wrap">{n.body}</p>
          <p className="text-[10px] text-muted-foreground">
            De {n.from_name} ·{" "}
            {new Date(n.created_at).toLocaleString("es-VE")}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {unread && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              title="Marcar como leída"
              onClick={markRead}
            >
              <Check className="size-4 text-green-600" />
            </Button>
          )}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title="Ocultar"
            onClick={() => setDismissed(true)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
