"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DonateDialog } from "./DonateDialog";

interface DonateButtonProps {
  centerId: string;
  centerName?: string;
  needId?: string | null;
  itemName: string;
  pledged?: boolean;
  onSuccess?: () => void;
  size?: "sm" | "default";
  className?: string;
}

export function DonateButton({
  centerId,
  centerName,
  needId,
  itemName,
  pledged = false,
  onSuccess,
  size = "sm",
  className,
}: DonateButtonProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  return (
    <>
      <Button
        size={size}
        variant={pledged ? "secondary" : "default"}
        className={className}
        onClick={handleOpen}
        disabled={pledged}
      >
        <Gift className="size-3.5" />
        {pledged ? "Prometido" : "Voy a donar"}
      </Button>

      <DonateDialog
        open={open}
        onOpenChange={setOpen}
        centerId={centerId}
        centerName={centerName}
        needId={needId}
        itemName={itemName}
        onSuccess={onSuccess}
      />
    </>
  );
}
