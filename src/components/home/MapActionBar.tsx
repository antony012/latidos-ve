"use client";

import { useState } from "react";
import { AlertTriangle, Bandage, Heart } from "lucide-react";
import { QuickDonateDialog } from "@/components/donor/QuickDonateDialog";
import { SosDialog } from "@/components/sos/SosDialog";

export function MapActionBar() {
  const [donateOpen, setDonateOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);

  const handleDonate = () => {
    setDonateOpen(true);
  };

  return (
    <>
      <div className="shrink-0 border-b bg-background px-3 py-3">
        <div className="mx-auto flex max-w-7xl gap-2.5 sm:gap-3">
          {/* SOS — acción secundaria, ancho fijo táctil */}
          <button
            type="button"
            onClick={() => setSosOpen(true)}
            className="flex h-[3.25rem] w-[3.25rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-red-600 text-white shadow-md transition-transform active:scale-95 sm:h-14 sm:w-14"
            aria-label="Pedir ayuda SOS"
          >
            <AlertTriangle className="size-5 sm:size-6" strokeWidth={2.5} />
            <span className="text-[9px] font-bold uppercase leading-none tracking-wide">
              SOS
            </span>
          </button>

          {/* Donar — acción principal, ocupa el espacio restante */}
          <button
            type="button"
            onClick={handleDonate}
            className="flex h-[3.25rem] min-w-0 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-green-600 px-4 text-white shadow-md transition-transform active:scale-[0.98] sm:h-14 sm:gap-3 sm:px-6"
            aria-label="Donar ahora"
          >
            <span className="flex items-center gap-1">
              <Heart
                className="size-5 fill-white sm:size-6"
                strokeWidth={2}
              />
              <Bandage className="size-5 sm:size-6" strokeWidth={2.5} />
            </span>
            <span className="text-base font-bold tracking-wide sm:text-lg">
              Donar
            </span>
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground sm:text-xs">
          Tu donación aparece en el mapa al confirmar · SOS alerta a quienes
          estén a 20 km
        </p>
      </div>

      <QuickDonateDialog open={donateOpen} onOpenChange={setDonateOpen} />
      <SosDialog open={sosOpen} onOpenChange={setSosOpen} />
    </>
  );
}
