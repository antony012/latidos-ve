"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  sendCenterNotification,
  StoreAuthError,
} from "@/lib/store/demo-store";
import type { CenterWithStats } from "@/types";

interface CenterNotifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  center: CenterWithStats | null;
  onSent?: () => void;
}

export function CenterNotifyDialog({
  open,
  onOpenChange,
  center,
  onSent,
}: CenterNotifyDialogProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setBody("");
    setError(null);
    setSent(false);
  }, [open, center?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!center) return;
    setError(null);
    setSubmitting(true);
    try {
      sendCenterNotification(center.id, title.trim(), body.trim());
      setSent(true);
      onSent?.();
      window.setTimeout(() => onOpenChange(false), 1200);
    } catch (e) {
      setError(
        e instanceof StoreAuthError
          ? e.message
          : "No se pudo enviar la notificación."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-5 text-violet-600" />
            Notificar al centro
          </DialogTitle>
          <DialogDescription>
            {center
              ? `Mensaje para ${center.name}. El encargado lo verá en su panel.`
              : "Selecciona un centro."}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <p className="py-6 text-center text-sm text-green-700 dark:text-green-300">
            Notificación enviada correctamente.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="notif-title">Asunto</Label>
              <Input
                id="notif-title"
                placeholder="Ej: Actualizar inventario urgente"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notif-body">Mensaje</Label>
              <Textarea
                id="notif-body"
                rows={4}
                placeholder="Escribe las instrucciones o avisos para el encargado…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}
            <DialogFooter className="px-0 pb-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || !center}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Enviar notificación
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
