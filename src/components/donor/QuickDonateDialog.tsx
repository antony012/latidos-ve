"use client";

import { useState } from "react";
import { ArrowLeft, Bandage, Building2, Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DonateButton } from "@/components/donor/DonateButton";
import { CenterPublicView } from "@/components/centers/CenterPublicView";
import { InventoryList } from "@/components/centers/InventoryList";
import { LocationPermissionCard } from "@/components/location/LocationPermissionCard";
import { useCenters, useCenterNeeds } from "@/hooks/use-centers";
import { getAllCenters, getCenterNeeds } from "@/lib/store/demo-store";
import { isProductionMode } from "@/lib/config/env";
import { CENTER_STATUS_LABELS } from "@/lib/constants/venezuela";
import type { CenterWithStats } from "@/types";
import { cn } from "@/lib/utils";

interface QuickDonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "center" | "items";

const STATUS_ORDER: Record<CenterWithStats["status"], number> = {
  urgent: 0,
  operational: 1,
  full: 2,
  closed: 3,
};

export function QuickDonateDialog({ open, onOpenChange }: QuickDonateDialogProps) {
  const [step, setStep] = useState<Step>("center");
  const [selectedCenter, setSelectedCenter] = useState<CenterWithStats | null>(
    null
  );
  const [centerSearch, setCenterSearch] = useState("");
  const [pledgedIds, setPledgedIds] = useState<Set<string>>(new Set());

  const { centers: remoteCenters } = useCenters();
  const { needs: remoteNeeds } = useCenterNeeds(selectedCenter?.id ?? null);

  const allCenters = isProductionMode() ? remoteCenters : getAllCenters();
  const q = centerSearch.trim().toLowerCase();
  const filteredCenters = allCenters
    .filter((c) => c.is_active)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    .filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );

  const centerNeeds = selectedCenter
    ? (isProductionMode() ? remoteNeeds : getCenterNeeds(selectedCenter.id)).filter(
        (n) => n.priority !== "covered"
      )
    : [];

  const reset = () => {
    setStep("center");
    setSelectedCenter(null);
    setCenterSearch("");
    setPledgedIds(new Set());
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) reset();
    onOpenChange(value);
  };

  const selectCenter = (center: CenterWithStats) => {
    setSelectedCenter(center);
    setStep("items");
  };

  const handlePledge = (needId: string) => {
    setPledgedIds((prev) => new Set(prev).add(needId));
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          {step === "items" && selectedCenter ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 mb-1 h-8 w-fit gap-1.5 px-2 text-muted-foreground"
                onClick={() => setStep("center")}
              >
                <ArrowLeft className="size-3.5" />
                Cambiar centro
              </Button>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-green-600" />
                {selectedCenter.name}
              </DialogTitle>
              <DialogDescription>
                {selectedCenter.city} ·{" "}
                {CENTER_STATUS_LABELS[selectedCenter.status]} · Elige qué vas a
                donar a este centro.
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-green-600">
                  <Heart className="size-5 fill-green-600" />
                  <Bandage className="size-5" />
                </span>
                Donar ahora
              </DialogTitle>
              <DialogDescription>
                Primero elige el centro de acopio. Luego selecciona el insumo
                que llevas — tu donación aparecerá en el mapa al confirmar.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        <LocationPermissionCard
          compact
          title="Permite tu ubicación para que tu donación aparezca en el mapa."
        />

        {step === "center" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar centro por nombre o ciudad…"
                value={centerSearch}
                onChange={(e) => setCenterSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredCenters.length === 0 ? (
              <div className="py-8 text-center">
                <Building2 className="mx-auto size-10 text-muted-foreground/40" />
                <p className="mt-3 font-medium">Sin centros disponibles</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {centerSearch.trim()
                    ? "Prueba con otro nombre o ciudad."
                    : "No hay centros de acopio activos en este momento."}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredCenters.map((center) => (
                  <li key={center.id}>
                    <CenterPublicView
                      center={center}
                      compact
                      selected={selectedCenter?.id === center.id}
                      onSelect={() => selectCenter(center)}
                    />
                  </li>
                ))}
              </ul>
            )}

            <p className="text-center text-[11px] text-muted-foreground">
              {filteredCenters.length} centro
              {filteredCenters.length === 1 ? "" : "s"} disponible
              {filteredCenters.length === 1 ? "" : "s"}
            </p>
          </div>
        ) : selectedCenter ? (
          <div className="space-y-4">
            {centerNeeds.length > 0 ? (
              <InventoryList
                centerId={selectedCenter.id}
                centerName={selectedCenter.name}
                needs={centerNeeds}
                showDonate
                pledgedIds={pledgedIds}
                onPledge={handlePledge}
              />
            ) : (
              <div className="rounded-xl border border-dashed py-6 text-center">
                <p className="font-medium">Sin insumos pendientes listados</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Puedes hacer una donación general a este centro.
                </p>
              </div>
            )}

            <div
              className={cn(
                "rounded-xl border bg-muted/30 p-3",
                centerNeeds.length > 0 && "border-dashed"
              )}
            >
              <p className="text-sm font-medium">¿Llevas algo que no está en la lista?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Registra una donación general y el centro la recibirá igualmente.
              </p>
              <div className="mt-3">
                <DonateButton
                  centerId={selectedCenter.id}
                  centerName={selectedCenter.name}
                  itemName="Donación general"
                  onSuccess={() => handleOpenChange(false)}
                  size="default"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
