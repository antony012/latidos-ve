"use client";

import { useState } from "react";
import { Check, Package, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteNeed,
  markNeedReceived,
  updateNeed,
} from "@/lib/store/demo-store";
import { getInventoryProgress, NEED_PRIORITY_STYLES } from "@/lib/utils/centers";
import type { CenterNeed, NeedPriority } from "@/types";

interface NeedAdminRowProps {
  need: CenterNeed;
}

export function NeedAdminRow({ need }: NeedAdminRowProps) {
  const styles = NEED_PRIORITY_STYLES[need.priority];
  const progress = getInventoryProgress(need);
  const [receiveQty, setReceiveQty] = useState("10");

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{need.item_name}</p>
          <Badge variant="outline" className={`mt-1 ${styles.badge}`}>
            {styles.label}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          onClick={() => deleteNeed(need.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {need.quantity_needed != null && need.priority !== "covered" && (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {need.quantity_received} / {need.quantity_needed} {need.unit}
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Select
          value={need.priority}
          onValueChange={(v) =>
            v && updateNeed(need.id, { priority: v as NeedPriority })
          }
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="urgent">Urgente</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
            <SelectItem value="covered">Cubierto</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="1"
            className="h-8 w-16"
            value={receiveQty}
            onChange={(e) => setReceiveQty(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              markNeedReceived(need.id, Number(receiveQty) || 1)
            }
          >
            <Package className="size-3.5" />
            Recibido
          </Button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => updateNeed(need.id, { priority: "covered" })}
        >
          <Check className="size-3.5" />
          Marcar cubierto
        </Button>
      </div>
    </div>
  );
}
