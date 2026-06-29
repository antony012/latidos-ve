-- =============================================================================
-- Venezuela Ayuda — PASO 1 de 2 (ejecutar SOLO este archivo primero)
--
-- PostgreSQL exige COMMIT antes de usar valores nuevos de un ENUM.
-- En el SQL Editor de Supabase: ejecuta este script, espera "Success",
-- luego ejecuta 003_security_and_pickups.sql en una consulta aparte.
-- =============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

ALTER TYPE pledge_status ADD VALUE IF NOT EXISTS 'confirmed' BEFORE 'in_transit';
