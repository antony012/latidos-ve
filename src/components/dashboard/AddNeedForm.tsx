"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addNeed, getCategories } from "@/lib/store/demo-store";
import type { NeedPriority } from "@/types";

interface AddNeedFormProps {
  centerId: string;
  onAdded?: () => void;
}

export function AddNeedForm({ centerId, onAdded }: AddNeedFormProps) {
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [priority, setPriority] = useState<NeedPriority>("urgent");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("unidades");
  const [notes, setNotes] = useState("");

  const categories = getCategories();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    addNeed({
      center_id: centerId,
      category_id: categoryId || null,
      item_name: itemName.trim(),
      priority,
      quantity_needed: quantity ? Number(quantity) : null,
      unit,
      notes: notes.trim() || null,
    });

    setItemName("");
    setCategoryId("");
    setPriority("urgent");
    setQuantity("");
    setUnit("unidades");
    setNotes("");
    setOpen(false);
    onAdded?.();
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full">
        <Plus className="size-4" />
        Agregar insumo faltante
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border bg-muted/20 p-4"
    >
      <p className="font-medium">Nuevo insumo necesario</p>

      <div className="space-y-1">
        <Label htmlFor="item">Nombre del insumo</Label>
        <Input
          id="item"
          placeholder="Ej: Agua potable, Pañales talla M..."
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Categoría</Label>
          <Select
            value={categoryId || "none"}
            onValueChange={(v) => setCategoryId(!v || v === "none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Prioridad</Label>
          <Select
            value={priority}
            onValueChange={(v) => v && setPriority(v as NeedPriority)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Urgente</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
              <SelectItem value="covered">Cubierto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="qty">Cantidad necesaria</Label>
          <Input
            id="qty"
            type="number"
            min="0"
            placeholder="500"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="unit">Unidad</Label>
          <Input
            id="unit"
            placeholder="cajas, kg, unidades..."
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Detalles adicionales para donantes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit">Publicar necesidad</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
