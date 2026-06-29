"use client";

import { useRef, useState } from "react";
import {
  Banknote,
  CalendarClock,
  Camera,
  Gift,
  Hand,
  ImagePlus,
  Loader2,
  Package,
  Truck,
  X,
} from "lucide-react";
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
import { useAuth } from "@/contexts/auth-context";
import { addPledge } from "@/lib/store/demo-store";
import {
  captureDonationLocation,
  getDonationLocation,
} from "@/lib/store/donation-location";
import { LocationPermissionCard } from "@/components/location/LocationPermissionCard";
import { DonationAddressField } from "@/components/donor/DonationAddressField";
import { geocodeAddress } from "@/lib/utils/geocode";
import {
  compressImage,
  formatFileSize,
  type ProcessedFile,
} from "@/lib/utils/file-upload";
import type { DeliveryMethod, DonationType } from "@/types";
import { cn } from "@/lib/utils";

export interface DonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centerId: string;
  centerName?: string;
  needId?: string | null;
  itemName: string;
  onSuccess?: () => void;
}

export function DonateDialog({
  open,
  onOpenChange,
  centerId,
  centerName,
  needId,
  itemName,
  onSuccess,
}: DonateDialogProps) {
  const { session } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [donationType, setDonationType] = useState<DonationType>("supplies");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("dropoff");
  const [quantity, setQuantity] = useState("1");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [scheduledAt, setScheduledAt] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [originCoords, setOriginCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<ProcessedFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setDonationType("supplies");
    setDeliveryMethod("dropoff");
    setQuantity("1");
    setAmount("");
    setScheduledAt("");
    setPickupAddress("");
    setPickupCoords(null);
    setOriginAddress("");
    setOriginCoords(null);
    setContactPhone("");
    setNotes("");
    setAttachment(null);
    setError(null);
  };

  const handleClose = (value: boolean) => {
    if (!value) reset();
    onOpenChange(value);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      const processed = await compressImage(file);
      setAttachment(processed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar la imagen");
      setAttachment(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (donationType === "money" && !attachment) {
      setError("Sube el comprobante de pago para donaciones en dinero.");
      return;
    }

    const isPickup = donationType === "supplies" && deliveryMethod === "pickup";
    const isDropoff = donationType === "supplies" && deliveryMethod === "dropoff";

    if (isPickup && !pickupAddress.trim()) {
      setError("Indica la dirección donde recogeremos la donación.");
      return;
    }
    if (isPickup && !contactPhone.trim()) {
      setError("Indica un teléfono de contacto para coordinar el retiro.");
      return;
    }
    if (isDropoff && !originAddress.trim() && !originCoords) {
      const cached = getDonationLocation();
      if (!cached) {
        setError(
          "Indica desde dónde sales o usa tu ubicación para colocarte en el mapa."
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;

      if (isDropoff) {
        if (originCoords) {
          latitude = originCoords.lat;
          longitude = originCoords.lng;
        } else {
          const cached = getDonationLocation();
          if (cached) {
            latitude = cached.lat;
            longitude = cached.lng;
          } else if (originAddress.trim()) {
            const geo = await geocodeAddress(originAddress.trim());
            latitude = geo.lat;
            longitude = geo.lng;
          }
        }
      }

      if (isPickup) {
        if (pickupCoords) {
          latitude = pickupCoords.lat;
          longitude = pickupCoords.lng;
        } else if (pickupAddress.trim()) {
          try {
            const geo = await geocodeAddress(pickupAddress.trim());
            latitude = geo.lat;
            longitude = geo.lng;
          } catch {
            // retiro sin pin en mapa si falla geocoding
          }
        }
      }

      if (latitude == null || longitude == null) {
        const pos = await captureDonationLocation();
        if (pos) {
          latitude = pos.lat;
          longitude = pos.lng;
        }
      }

      await addPledge({
        center_id: centerId,
        need_id: needId ?? null,
        donor_name: session?.name ?? "Donante anónimo",
        items_description: itemName,
        quantity: Number(quantity) || 1,
        donation_type: donationType,
        amount: donationType === "money" && amount ? Number(amount) : null,
        currency: donationType === "money" ? currency : null,
        attachment_url: attachment?.dataUrl ?? null,
        attachment_name: attachment?.name ?? null,
        delivery_method: donationType === "money" ? "dropoff" : deliveryMethod,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        pickup_address: isPickup ? pickupAddress.trim() : null,
        origin_address: isDropoff ? originAddress.trim() || null : null,
        contact_phone: isPickup ? contactPhone.trim() : null,
        latitude,
        longitude,
        notes: notes.trim() || null,
      });

      onSuccess?.();
      handleClose(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo confirmar la donación.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar donación</DialogTitle>
          <DialogDescription>
            {itemName}
            {centerName && ` · ${centerName}`}
          </DialogDescription>
        </DialogHeader>

        <LocationPermissionCard compact />

        <div className="space-y-4">
          {/* Tipo de donación */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDonationType("supplies");
                setAttachment(null);
                setError(null);
              }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                donationType === "supplies"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "hover:bg-muted/50"
              )}
            >
              <Package className="size-6 text-primary" />
              <span className="text-sm font-medium">Insumos</span>
              <span className="text-[10px] text-muted-foreground">
                Llevo productos físicos
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDonationType("money");
                setAttachment(null);
                setError(null);
              }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                donationType === "money"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "hover:bg-muted/50"
              )}
            >
              <Banknote className="size-6 text-green-600" />
              <span className="text-sm font-medium">Dinero</span>
              <span className="text-[10px] text-muted-foreground">
                Transferencia o pago móvil
              </span>
            </button>
          </div>

          {donationType === "supplies" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="qty">Cantidad que donas</Label>
                <Input
                  id="qty"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              {/* Método de entrega */}
              <div className="space-y-2">
                <Label>¿Cómo la haces llegar?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("dropoff")}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                      deliveryMethod === "dropoff"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Hand className="size-5 text-primary" />
                    <span className="text-sm font-medium">La llevo yo</span>
                    <span className="text-[10px] text-muted-foreground">
                      Voy al centro de acopio
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("pickup")}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                      deliveryMethod === "pickup"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Truck className="size-5 text-primary" />
                    <span className="text-sm font-medium">Programar retiro</span>
                    <span className="text-[10px] text-muted-foreground">
                      Que la recojan
                    </span>
                  </button>
                </div>
              </div>

              {deliveryMethod === "dropoff" && (
                <DonationAddressField
                  id="origin-addr"
                  label="¿Desde dónde sales con la donación?"
                  required
                  value={originAddress}
                  onChange={setOriginAddress}
                  coords={originCoords}
                  onCoordsChange={setOriginCoords}
                  hint="Tu pin aparecerá en el mapa para que el centro y otros donantes te vean en camino."
                />
              )}

              {deliveryMethod === "pickup" && (
                <div className="space-y-3">
                  <DonationAddressField
                    id="pickup-addr"
                    label="Dirección de retiro"
                    required
                    value={pickupAddress}
                    onChange={setPickupAddress}
                    coords={pickupCoords}
                    onCoordsChange={setPickupCoords}
                    hint="Indica dónde recogeremos los insumos."
                  />
                  <div className="space-y-1">
                    <Label htmlFor="phone">
                      Teléfono de contacto <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0414-1234567"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="sched" className="flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" />
                  {deliveryMethod === "pickup"
                    ? "Fecha y hora preferida del retiro"
                    : "¿Cuándo la llevas? (opcional)"}
                </Label>
                <Input
                  id="sched"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="amount">Monto (opcional)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="50.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Moneda</Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="USD"
                />
              </div>
            </div>
          )}

          {/* Adjunto */}
          <div className="space-y-2">
            <Label>
              {donationType === "money" ? (
                <>Comprobante de pago <span className="text-red-600">*</span></>
              ) : (
                <>Foto de los insumos <span className="text-muted-foreground">(recomendado)</span></>
              )}
            </Label>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />

            {attachment ? (
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachment.dataUrl}
                    alt="Vista previa"
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.sizeBytes)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAttachment(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                disabled={processing}
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed p-6 transition-colors hover:border-primary hover:bg-primary/5"
              >
                {processing ? (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                ) : donationType === "money" ? (
                  <Camera className="size-8 text-muted-foreground" />
                ) : (
                  <ImagePlus className="size-8 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {processing
                    ? "Comprimiendo imagen…"
                    : donationType === "money"
                      ? "Subir captura del comprobante"
                      : "Subir foto de lo que donas"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  JPG, PNG o WebP · máx. 5 MB
                </span>
              </button>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder={
                donationType === "money"
                  ? "Ej: Referencia 123456, Pago Móvil Banesco..."
                  : "Ej: 2 cajas de agua, entrego mañana en la mañana..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || processing}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Gift className="size-4" />
            )}
            Confirmar donación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
