-- Notificaciones del super admin hacia centros de acopio

CREATE TABLE IF NOT EXISTS center_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES collection_centers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  from_name TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_center_notifications_center
  ON center_notifications(center_id, created_at DESC);

ALTER TABLE center_notifications ENABLE ROW LEVEL SECURITY;

-- Super admin: enviar y eliminar
CREATE POLICY "super_admin_manage_notifications"
  ON center_notifications
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Encargado del centro: leer y marcar como leída
CREATE POLICY "center_admin_read_notifications"
  ON center_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collection_centers c
      WHERE c.id = center_notifications.center_id
        AND c.manager_id = auth.uid()
    )
  );

CREATE POLICY "center_admin_mark_read"
  ON center_notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collection_centers c
      WHERE c.id = center_notifications.center_id
        AND c.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collection_centers c
      WHERE c.id = center_notifications.center_id
        AND c.manager_id = auth.uid()
    )
  );
