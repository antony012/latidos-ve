import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
        <WifiOff className="size-8 text-amber-700 dark:text-amber-300" />
      </div>
      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-semibold">Sin conexión a internet</h1>
        <p className="text-sm text-muted-foreground">
          Los datos que ya visitaste siguen disponibles. Vuelve a la página
          principal para consultar centros de acopio en caché.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
      >
        Ir al mapa
      </Link>
    </div>
  );
}
