-- Códigos de acceso para encargados de centro (gestionados solo vía API con service role)

CREATE TABLE IF NOT EXISTS public.center_access_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id   UUID NOT NULL UNIQUE REFERENCES public.collection_centers(id) ON DELETE CASCADE,
  access_code TEXT NOT NULL,
  label       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_center_access_codes_center
  ON public.center_access_codes(center_id);

ALTER TABLE public.center_access_codes ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS center_access_codes_updated_at ON public.center_access_codes;
CREATE TRIGGER center_access_codes_updated_at
  BEFORE UPDATE ON public.center_access_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
