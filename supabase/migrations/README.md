# Migraciones Supabase — Venezuela Ayuda

Ejecuta los archivos **en orden** en el [SQL Editor](https://supabase.com/dashboard/project/_/sql) de tu proyecto.

## Orden

| # | Archivo | Notas |
|---|---------|--------|
| 1 | `001_initial_schema.sql` | Esquema base + datos semilla |
| 2 | `002_pledge_attachments.sql` | Fotos y comprobantes en promesas |
| 3a | **`003a_enum_values.sql`** | **Ejecutar solo y esperar Success** |
| 3 | `003_security_and_pickups.sql` | **Nueva consulta** después del paso 3a |
| 4 | `004_sos_alerts.sql` | Alertas SOS |
| 5 | `005_center_notifications.sql` | Notificaciones del super admin |
| 6 | `006_app_features.sql` | Fotos, verificado, agradecimientos, mapa |
| 7 | `007_center_access_codes.sql` | Códigos de acceso para encargados de centro |

## Error `unsafe use of new value "super_admin"`

PostgreSQL no permite usar un valor de ENUM recién creado en la misma transacción.

**Solución:** ejecuta `003a_enum_values.sql` primero (solo esas 2 líneas), confirma que terminó, y luego ejecuta `003_security_and_pickups.sql` en otra consulta.

Si ya ejecutaste el paso 3a con éxito, puedes ejecutar solo `003_security_and_pickups.sql` (omite 003a).

## Después de las migraciones

1. **Realtime:** Database → Replication → activa `collection_centers`, `center_needs`, `donation_pledges`.
2. **Auth:** Authentication → URL Configuration → añade tu dominio y `http://localhost:3000`.
3. **Variables en la app:** copia `.env.example` a `.env.local` con URL y anon key del proyecto.
