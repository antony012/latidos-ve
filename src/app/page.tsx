import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HomeMapView } from "@/components/home/HomeMapView";
import { APP_NAME } from "@/lib/constants/branding";

export default function HomePage() {
  return (
    <AppShell>
      <PageHeader
        title="Mapa de solidaridad"
        description={`${APP_NAME}: centros de acopio, donaciones en camino y alertas SOS.`}
        className="hidden shrink-0 py-3 md:block md:py-5"
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <HomeMapView />
      </div>
    </AppShell>
  );
}
