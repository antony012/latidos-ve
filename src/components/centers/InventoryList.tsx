"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DonateButton } from "@/components/donor/DonateButton";
import { getInventoryProgress } from "@/lib/utils/centers";
import { NEED_PRIORITY_STYLES } from "@/lib/utils/centers";
import type { CenterNeed } from "@/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface InventoryListProps {
  centerId: string;
  centerName?: string;
  needs: CenterNeed[];
  showDonate?: boolean;
  pledgedIds?: Set<string>;
  onPledge?: (needId: string) => void;
}

function NeedItem({
  need,
  centerId,
  centerName,
  showDonate,
  pledged,
  onPledge,
}: {
  need: CenterNeed;
  centerId: string;
  centerName?: string;
  showDonate?: boolean;
  pledged?: boolean;
  onPledge?: (needId: string) => void;
}) {
  const styles = NEED_PRIORITY_STYLES[need.priority];
  const progress = getInventoryProgress(need);
  const isCovered = need.priority === "covered";

  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <span
          className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", styles.dot)}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{need.item_name}</p>
            <Badge variant="outline" className={styles.badge}>
              {styles.label}
            </Badge>
          </div>

          {!isCovered && need.quantity_needed != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {need.quantity_received} / {need.quantity_needed} {need.unit}
                </span>
                <span>{progress}% cubierto</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {isCovered && (
            <p className="text-xs text-green-700 dark:text-green-400">
              Inventario completo · {need.quantity_received} {need.unit} recibidos
            </p>
          )}

          {need.notes && (
            <p className="text-xs text-muted-foreground">{need.notes}</p>
          )}

          <p className="text-[10px] text-muted-foreground">
            Actualizado:{" "}
            {new Date(need.updated_at).toLocaleString("es-VE", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        </div>

        {showDonate && !isCovered && (
          <DonateButton
            centerId={centerId}
            centerName={centerName}
            needId={need.id}
            itemName={need.item_name}
            pledged={pledged}
            onSuccess={() => onPledge?.(need.id)}
          />
        )}
      </div>
    </li>
  );
}

export function InventoryList({
  centerId,
  centerName,
  needs,
  showDonate = true,
  pledgedIds,
  onPledge,
}: InventoryListProps) {
  const [localPledged, setLocalPledged] = useState<Set<string>>(
    pledgedIds ?? new Set()
  );

  const merged = new Set([...localPledged, ...(pledgedIds ?? [])]);

  const handlePledge = (needId: string) => {
    setLocalPledged((prev) => new Set(prev).add(needId));
    onPledge?.(needId);
  };

  if (!needs.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay insumos registrados en este centro.
      </p>
    );
  }

  const urgent = needs.filter((n) => n.priority === "urgent");
  const other = needs.filter((n) => n.priority !== "urgent");

  return (
    <div className="space-y-4">
      {urgent.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
            Urgente — falta ahora
          </h4>
          <ul className="space-y-2">
            {urgent.map((need) => (
              <NeedItem
                key={need.id}
                need={need}
                centerId={centerId}
                centerName={centerName}
                showDonate={showDonate}
                pledged={merged.has(need.id)}
                onPledge={handlePledge}
              />
            ))}
          </ul>
        </div>
      )}

      {other.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">
            Otros insumos
          </h4>
          <ul className="space-y-2">
            {other.map((need) => (
              <NeedItem
                key={need.id}
                need={need}
                centerId={centerId}
                centerName={centerName}
                showDonate={showDonate}
                pledged={merged.has(need.id)}
                onPledge={handlePledge}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
