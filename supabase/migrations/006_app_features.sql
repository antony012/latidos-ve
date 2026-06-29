-- =============================================================================
-- Venezuela Ayuda — Campos de la app + feed de agradecimientos + lectura en mapa
-- Ejecutar después de 005_center_notifications.sql
-- =============================================================================

-- Centros: foto y sello verificado
ALTER TABLE public.collection_centers
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Promesas: dirección de origen del donante
ALTER TABLE public.donation_pledges
  ADD COLUMN IF NOT EXISTS origin_address TEXT;

-- Feed público de agradecimientos en el inicio
CREATE TABLE IF NOT EXISTS public.donation_announcements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pledge_id         UUID REFERENCES public.donation_pledges(id) ON DELETE CASCADE,
  donor_name        TEXT NOT NULL,
  items_description TEXT NOT NULL,
  center_name       TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donation_announcements_created
  ON public.donation_announcements(created_at DESC);

ALTER TABLE public.donation_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de agradecimientos" ON public.donation_announcements;
CREATE POLICY "Lectura pública de agradecimientos"
  ON public.donation_announcements FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Insertar agradecimiento al donar" ON public.donation_announcements;
CREATE POLICY "Insertar agradecimiento al donar"
  ON public.donation_announcements FOR INSERT
  WITH CHECK (TRUE);

-- Promesas activas con ubicación visibles en el mapa (público)
DROP POLICY IF EXISTS "Promesas en mapa visibles públicamente" ON public.donation_pledges;
CREATE POLICY "Promesas en mapa visibles públicamente"
  ON public.donation_pledges FOR SELECT
  USING (
    status::text IN ('pending', 'confirmed', 'in_transit')
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
  );

-- Vista de stats: hay que DROP + CREATE (no REPLACE) cuando c.* gana columnas nuevas
DROP VIEW IF EXISTS public.centers_with_stats;

CREATE VIEW public.centers_with_stats AS
SELECT
  c.*,
  COUNT(n.id) FILTER (WHERE n.priority = 'urgent') AS urgent_needs_count,
  COUNT(n.id) FILTER (WHERE n.priority = 'covered') AS covered_needs_count,
  COUNT(n.id) AS total_needs_count,
  COUNT(p.id) FILTER (
    WHERE p.status::text IN ('pending', 'confirmed', 'in_transit')
  ) AS pending_pledges_count
FROM public.collection_centers c
LEFT JOIN public.center_needs n ON n.center_id = c.id
LEFT JOIN public.donation_pledges p ON p.center_id = c.id
WHERE c.is_active = TRUE
GROUP BY c.id;

GRANT SELECT ON public.centers_with_stats TO anon, authenticated;

-- Realtime (activar también en Dashboard → Database → Replication):
-- donation_announcements, donation_pledges, sos_alerts
