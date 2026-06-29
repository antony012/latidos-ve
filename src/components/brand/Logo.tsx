import Image from "next/image";
import { cn } from "@/lib/utils";
import { APP_TAGLINE } from "@/lib/constants/branding";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** Icono de la app (latido / ECG). */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <Image
      src="/icons/icon.svg"
      alt=""
      width={size}
      height={size}
      className={cn("rounded-lg shadow-sm", className)}
      priority
    />
  );
}

interface LogoBrandProps {
  showTagline?: boolean;
  compact?: boolean;
  className?: string;
}

/** Logo + nombre LatidosVE. */
export function LogoBrand({
  showTagline = true,
  compact = false,
  className,
}: LogoBrandProps) {
  const size = compact ? 28 : 36;
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <div className="min-w-0">
        <p
          className={cn(
            "font-bold leading-none tracking-tight",
            compact ? "text-sm" : "text-base"
          )}
        >
          Latidos
          <span className="text-red-600">VE</span>
        </p>
        {showTagline && (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-xs">
            {APP_TAGLINE}
          </p>
        )}
      </div>
    </div>
  );
}

/** Bloque grande para login / marketing. */
export function LogoHero({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <LogoMark size={72} className="shadow-md" />
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        Bienvenido a Latidos<span className="text-red-600">VE</span>
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{APP_TAGLINE}</p>
    </div>
  );
}
