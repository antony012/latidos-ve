-- Campos adicionales para comprobantes y fotos de donación
-- Ejecutar cuando conectes Supabase Storage

ALTER TABLE public.donation_pledges
  ADD COLUMN IF NOT EXISTS donation_type TEXT NOT NULL DEFAULT 'supplies'
    CHECK (donation_type IN ('money', 'supplies')),
  ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Bucket sugerido: donation-proofs (privado, acceso por RLS)
-- CREATE POLICY "Donantes suben comprobantes"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'donation-proofs');

COMMENT ON COLUMN public.donation_pledges.attachment_url IS
  'URL en Supabase Storage del comprobante (dinero) o foto (insumos)';
