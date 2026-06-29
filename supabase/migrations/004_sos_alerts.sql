-- Alertas SOS con geolocalización y notificación por proximidad

CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name   TEXT NOT NULL,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  location    GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
                ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
              ) STORED,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'resolved', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_status ON public.sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_location ON public.sos_alerts USING GIST(location);

ALTER TABLE public.donation_pledges
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE TRIGGER sos_alerts_updated_at
  BEFORE UPDATE ON public.sos_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crear alerta SOS"
  ON public.sos_alerts FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Ver alertas SOS activas"
  ON public.sos_alerts FOR SELECT
  USING (
    status = 'active'
    OR user_id = auth.uid()
    OR public.is_super_admin()
  );

CREATE POLICY "Actualizar alerta SOS propia"
  ON public.sos_alerts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

-- Buscar alertas SOS en radio (km) — para notificaciones push futuras
CREATE OR REPLACE FUNCTION public.nearby_sos_alerts(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 20
)
RETURNS SETOF public.sos_alerts AS $$
BEGIN
  RETURN QUERY
  SELECT s.*
  FROM public.sos_alerts s
  WHERE s.status = 'active'
    AND ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY ST_Distance(
    s.location,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql STABLE;
