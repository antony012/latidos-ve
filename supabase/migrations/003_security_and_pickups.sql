-- =============================================================================
-- Venezuela Ayuda — Seguridad reforzada + programación de retiros
-- - Rol super_admin con acceso global
-- - Ciclo de vida de promesas (estado 'confirmed')
-- - Método de entrega: el donante lleva la donación o programa un retiro
-- - Políticas RLS endurecidas por rol (donante / encargado / super admin)
--
-- IMPORTANTE: ejecutar ANTES el archivo 003a_enum_values.sql y confirmar
-- que terminó bien. Luego ejecutar ESTE archivo en una consulta nueva.
-- Ejecutar después de 001 y 002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Campos de entrega / retiro en promesas
-- -----------------------------------------------------------------------------

ALTER TABLE public.donation_pledges
  ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'dropoff'
    CHECK (delivery_method IN ('dropoff', 'pickup')),
  ADD COLUMN IF NOT EXISTS scheduled_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_address TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone  TEXT;

COMMENT ON COLUMN public.donation_pledges.delivery_method IS
  'dropoff = el donante lleva la donación; pickup = el donante solicita retiro';
COMMENT ON COLUMN public.donation_pledges.pickup_address IS
  'Dirección de retiro cuando delivery_method = pickup';

CREATE INDEX IF NOT EXISTS idx_pledges_delivery ON public.donation_pledges(delivery_method);
CREATE INDEX IF NOT EXISTS idx_pledges_scheduled ON public.donation_pledges(scheduled_at);

-- -----------------------------------------------------------------------------
-- 2. Funciones helper de autorización (SECURITY DEFINER para evitar recursión RLS)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'super_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_center_manager(target_center UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collection_centers cc
    WHERE cc.id = target_center AND cc.manager_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 3. Políticas RLS endurecidas
--    Reemplazamos las políticas existentes por versiones con jerarquía de rol.
-- -----------------------------------------------------------------------------

-- CENTROS ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Centros activos visibles públicamente" ON public.collection_centers;
DROP POLICY IF EXISTS "Admins crean centros" ON public.collection_centers;
DROP POLICY IF EXISTS "Admins actualizan sus centros" ON public.collection_centers;

-- Público: solo ve centros activos. Encargado/super admin: ven también inactivos.
CREATE POLICY "Lectura de centros"
  ON public.collection_centers FOR SELECT
  USING (
    is_active = TRUE
    OR manager_id = auth.uid()
    OR public.is_super_admin()
  );

-- Solo super admin crea centros (control central de la plataforma).
CREATE POLICY "Super admin crea centros"
  ON public.collection_centers FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

-- Encargado actualiza su centro; super admin cualquiera.
CREATE POLICY "Gestión de centros"
  ON public.collection_centers FOR UPDATE TO authenticated
  USING (manager_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (manager_id = auth.uid() OR public.is_super_admin());

-- Solo super admin elimina/desactiva definitivamente.
CREATE POLICY "Super admin elimina centros"
  ON public.collection_centers FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- NECESIDADES -----------------------------------------------------------------
DROP POLICY IF EXISTS "Necesidades visibles públicamente" ON public.center_needs;
DROP POLICY IF EXISTS "Admins gestionan necesidades de su centro" ON public.center_needs;

CREATE POLICY "Lectura pública de necesidades"
  ON public.center_needs FOR SELECT USING (TRUE);

CREATE POLICY "Encargado gestiona necesidades de su centro"
  ON public.center_needs FOR ALL TO authenticated
  USING (public.is_center_manager(center_id) OR public.is_super_admin())
  WITH CHECK (public.is_center_manager(center_id) OR public.is_super_admin());

-- PROMESAS --------------------------------------------------------------------
DROP POLICY IF EXISTS "Donantes crean promesas" ON public.donation_pledges;
DROP POLICY IF EXISTS "Promesas visibles para centro y donante" ON public.donation_pledges;
DROP POLICY IF EXISTS "Donantes actualizan sus promesas" ON public.donation_pledges;

-- Crear: cualquiera puede prometer, pero un usuario autenticado no puede
-- suplantar a otro (donor_id debe ser el suyo o nulo/anónimo).
CREATE POLICY "Crear promesas"
  ON public.donation_pledges FOR INSERT
  WITH CHECK (donor_id IS NULL OR donor_id = auth.uid());

-- Ver: el donante ve las suyas; el encargado las de su centro; super admin todo.
CREATE POLICY "Lectura de promesas"
  ON public.donation_pledges FOR SELECT
  USING (
    donor_id = auth.uid()
    OR public.is_center_manager(center_id)
    OR public.is_super_admin()
  );

-- Actualizar: el donante solo su propia promesa (p. ej. cancelar);
-- el encargado las de su centro (confirmar, en camino, recibido);
-- super admin cualquiera.
CREATE POLICY "Actualizar promesas"
  ON public.donation_pledges FOR UPDATE TO authenticated
  USING (
    donor_id = auth.uid()
    OR public.is_center_manager(center_id)
    OR public.is_super_admin()
  )
  WITH CHECK (
    donor_id = auth.uid()
    OR public.is_center_manager(center_id)
    OR public.is_super_admin()
  );

-- -----------------------------------------------------------------------------
-- 4. La vista de stats debe contar también promesas 'confirmed' como entrantes
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.centers_with_stats AS
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

-- -----------------------------------------------------------------------------
-- 5. Almacenamiento privado de comprobantes/fotos (Supabase Storage)
--    Bucket 'donation-proofs' PRIVADO. Solo el dueño, el encargado del centro
--    y el super admin pueden leer el comprobante.
-- -----------------------------------------------------------------------------

-- INSERT INTO storage.buckets (id, name, public) VALUES ('donation-proofs', 'donation-proofs', false)
--   ON CONFLICT (id) DO NOTHING;
--
-- CREATE POLICY "Subir comprobante propio"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'donation-proofs' AND owner = auth.uid());
--
-- CREATE POLICY "Leer comprobante propio o como admin"
--   ON storage.objects FOR SELECT TO authenticated
--   USING (
--     bucket_id = 'donation-proofs'
--     AND (owner = auth.uid() OR public.is_super_admin())
--   );
