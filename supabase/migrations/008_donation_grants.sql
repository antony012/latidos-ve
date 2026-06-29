-- =============================================================================
-- LatidosVE — Permisos para donaciones anónimas y feed público
-- Ejecutar en Supabase SQL Editor si falla "No se pudo confirmar la donación"
-- =============================================================================

GRANT SELECT, INSERT ON public.donation_pledges TO anon, authenticated;
GRANT SELECT, INSERT ON public.donation_announcements TO anon, authenticated;

DROP POLICY IF EXISTS "Crear promesas" ON public.donation_pledges;
CREATE POLICY "Crear promesas"
  ON public.donation_pledges FOR INSERT
  TO anon, authenticated
  WITH CHECK (donor_id IS NULL OR donor_id = auth.uid());

DROP POLICY IF EXISTS "Insertar agradecimiento al donar" ON public.donation_announcements;
CREATE POLICY "Insertar agradecimiento al donar"
  ON public.donation_announcements FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);
