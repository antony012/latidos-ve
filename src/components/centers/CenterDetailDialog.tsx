"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CenterPublicView } from "./CenterPublicView";
import type { CenterWithStats } from "@/types";

interface CenterDetailDialogProps {
  center: CenterWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CenterDetailDialog({
  center,
  open,
  onOpenChange,
}: CenterDetailDialogProps) {
  if (!center) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">{center.name}</DialogTitle>
        </DialogHeader>
        <CenterPublicView center={center} />
      </DialogContent>
    </Dialog>
  );
}
