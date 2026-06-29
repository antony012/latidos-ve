import { Skeleton } from "@/components/ui/skeleton";

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div className={`relative w-full bg-muted/30 ${className ?? "h-full"}`}>
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="rounded-lg bg-background/80 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
          Cargando mapa…
        </p>
      </div>
    </div>
  );
}
