"use client";

import { useState } from "react";
import { ImageIcon, FileText, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DonationPledge } from "@/types";
import { cn } from "@/lib/utils";

interface PledgeAttachmentProps {
  pledge: Pick<
    DonationPledge,
    "donation_type" | "attachment_url" | "attachment_name" | "amount" | "currency"
  >;
  className?: string;
  size?: "sm" | "md";
}

export function PledgeAttachmentBadge({
  pledge,
  className,
}: {
  pledge: PledgeAttachmentProps["pledge"];
  className?: string;
}) {
  if (!pledge.attachment_url) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium",
        className
      )}
    >
      {pledge.donation_type === "money" ? (
        <FileText className="size-3" />
      ) : (
        <ImageIcon className="size-3" />
      )}
      {pledge.donation_type === "money" ? "Comprobante" : "Foto adjunta"}
    </span>
  );
}

export function PledgeAttachmentPreview({
  pledge,
  className,
  size = "sm",
}: PledgeAttachmentProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!pledge.attachment_url) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Sin {pledge.donation_type === "money" ? "comprobante" : "foto"} adjunta
      </p>
    );
  }

  const thumbSize = size === "sm" ? "size-16" : "size-24";

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className={cn(
          "group relative overflow-hidden rounded-lg border bg-muted",
          thumbSize,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pledge.attachment_url}
          alt={pledge.attachment_name ?? "Adjunto"}
          className="size-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <ZoomIn className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </button>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {pledge.donation_type === "money"
                ? "Comprobante de pago"
                : "Foto de insumos"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pledge.attachment_url}
              alt={pledge.attachment_name ?? "Adjunto"}
              className="size-full object-contain"
            />
          </div>
          {pledge.amount != null && (
            <p className="text-sm text-muted-foreground">
              Monto: {pledge.amount} {pledge.currency ?? "USD"}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
