import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedCenterBadgeProps {
  className?: string;
  /** sm = solo icono en mapa; md = icono + texto */
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function VerifiedCenterBadge({
  className,
  size = "md",
  showLabel = true,
}: VerifiedCenterBadgeProps) {
  const iconOnly = size === "sm" || !showLabel;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-600 font-medium text-white shadow-sm",
        iconOnly ? "size-5 justify-center p-0" : "px-2 py-0.5 text-[10px]",
        className
      )}
      title="Centro de acopio verificado por LatidosVE"
    >
      <BadgeCheck
        className={cn(iconOnly ? "size-3" : "size-3.5")}
        strokeWidth={2.5}
      />
      {!iconOnly && showLabel && <span>Verificado</span>}
    </span>
  );
}

/** HTML del sello verificado para marcadores Leaflet */
export function verifiedMarkerOverlayHtml(size = 16): string {
  const s = size;
  return `
    <div style="
      position:absolute;bottom:-2px;right:-2px;
      width:${s}px;height:${s}px;
      background:#2563eb;
      border:2px solid white;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 1px 4px rgba(0,0,0,0.35);
      z-index:2;
    ">
      <svg width="${Math.round(s * 0.6)}" height="${Math.round(s * 0.6)}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    </div>
  `;
}
