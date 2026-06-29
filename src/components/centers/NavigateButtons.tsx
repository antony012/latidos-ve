"use client";

import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAppleMapsUrl,
  getGoogleMapsDirectionsUrl,
  getOpenStreetMapUrl,
  getWazeUrl,
} from "@/lib/utils/navigation";

interface NavigateButtonsProps {
  latitude: number;
  longitude: number;
  address: string;
  compact?: boolean;
}

export function NavigateButtons({
  latitude,
  longitude,
  address,
  compact = false,
}: NavigateButtonsProps) {
  const links = [
    {
      label: "Google Maps",
      href: getGoogleMapsDirectionsUrl(latitude, longitude),
      icon: Navigation,
      primary: true,
    },
    {
      label: "Waze",
      href: getWazeUrl(latitude, longitude),
      icon: MapPin,
    },
    {
      label: "Apple Maps",
      href: getAppleMapsUrl(latitude, longitude),
      icon: ExternalLink,
    },
    {
      label: "OpenStreetMap",
      href: getOpenStreetMapUrl(latitude, longitude),
      icon: MapPin,
    },
  ];

  if (compact) {
    return (
      <a
        href={links[0].href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700"
      >
        <Navigation className="size-4" />
        Cómo llegar — {address}
      </a>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Llegar al centro en 1 clic</p>
      <div className="grid grid-cols-2 gap-2">
        {links.map(({ label, href, icon: Icon, primary }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={
              primary
                ? "col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700"
                : "inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-background text-sm hover:bg-muted"
            }
          >
            <Icon className="size-4" />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
