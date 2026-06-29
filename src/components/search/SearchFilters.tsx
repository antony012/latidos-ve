"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchFiltersProps {
  city: string;
  onCityChange: (city: string) => void;
  needSlug?: string;
  onNeedSlugChange: (slug: string | undefined) => void;
}

export function SearchFilters({
  city,
  onCityChange,
  needSlug,
  onNeedSlugChange,
}: SearchFiltersProps) {
  return (
    <div className="flex shrink-0 flex-col gap-2 border-b bg-background p-2.5 sm:flex-row sm:p-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por ciudad..."
          className="pl-9"
          aria-label="Buscar centros por ciudad"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
        />
      </div>
      <Select
        value={needSlug ?? "all"}
        onValueChange={(v) =>
          onNeedSlugChange(!v || v === "all" ? undefined : v)
        }
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="Filtrar por necesidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las necesidades</SelectItem>
          <SelectItem value="agua">Agua potable</SelectItem>
          <SelectItem value="medicamentos">Medicamentos</SelectItem>
          <SelectItem value="alimentos">Alimentos</SelectItem>
          <SelectItem value="ropa">Ropa y calzado</SelectItem>
          <SelectItem value="colchones">Colchones y frazadas</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
