-- =============================================================================
-- Venezuela Ayuda — Esquema inicial
-- Plataforma de conexión entre Centros de Acopio y Donantes
-- Ejecutar en Supabase SQL Editor o via CLI: supabase db push
-- =============================================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('donor', 'center_admin', 'volunteer');

CREATE TYPE center_status AS ENUM (
  'urgent',       -- Necesita ayuda urgente
  'operational',  -- Operativo
  'full',         -- Capacidad llena
  'closed'        -- Cerrado temporalmente
);

CREATE TYPE need_priority AS ENUM (
  'urgent',   -- Alta prioridad (rojo)
  'medium',   -- Prioridad media (amarillo)
  'low',      -- Baja prioridad
  'covered'   -- Cubierto / no se necesita más (verde)
);

CREATE TYPE pledge_status AS ENUM (
  'pending',
  'in_transit',
  'delivered',
  'cancelled'
);

-- -----------------------------------------------------------------------------
-- PERFILES (extiende auth.users de Supabase)
-- -----------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  role          user_role NOT NULL DEFAULT 'donor',
  avatar_url    TEXT,
  city          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_city ON public.profiles(city);

-- Auto-crear perfil al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Usuario'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'donor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- CATÁLOGO DE NECESIDADES (items reutilizables)
-- -----------------------------------------------------------------------------

CREATE TABLE public.need_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- CENTROS DE ACOPIO
-- -----------------------------------------------------------------------------

CREATE TABLE public.collection_centers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  address         TEXT NOT NULL,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL,  -- Estado venezolano (Miranda, Zulia, etc.)
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  location        GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
                    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
                  ) STORED,
  schedule        JSONB NOT NULL DEFAULT '{"weekdays": "8:00-18:00", "weekends": "9:00-14:00"}'::jsonb,
  status          center_status NOT NULL DEFAULT 'operational',
  phone           TEXT,
  email           TEXT,
  manager_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
  )
);

CREATE INDEX idx_centers_city ON public.collection_centers(city);
CREATE INDEX idx_centers_state ON public.collection_centers(state);
CREATE INDEX idx_centers_status ON public.collection_centers(status);
CREATE INDEX idx_centers_active ON public.collection_centers(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_centers_location ON public.collection_centers USING GIST(location);
CREATE INDEX idx_centers_name_trgm ON public.collection_centers USING GIN(name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- NECESIDADES POR CENTRO (inventario dinámico)
-- -----------------------------------------------------------------------------

CREATE TABLE public.center_needs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id         UUID NOT NULL REFERENCES public.collection_centers(id) ON DELETE CASCADE,
  category_id       UUID REFERENCES public.need_categories(id) ON DELETE SET NULL,
  item_name         TEXT NOT NULL,
  priority          need_priority NOT NULL DEFAULT 'medium',
  quantity_needed   INT,
  quantity_received INT NOT NULL DEFAULT 0,
  unit              TEXT DEFAULT 'unidades',
  notes             TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_center_item UNIQUE (center_id, item_name)
);

CREATE INDEX idx_center_needs_center ON public.center_needs(center_id);
CREATE INDEX idx_center_needs_priority ON public.center_needs(priority);
CREATE INDEX idx_center_needs_category ON public.center_needs(category_id);

-- -----------------------------------------------------------------------------
-- PROMESAS DE DONACIÓN ("Voy a donar esto")
-- -----------------------------------------------------------------------------

CREATE TABLE public.donation_pledges (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id           UUID NOT NULL REFERENCES public.collection_centers(id) ON DELETE CASCADE,
  need_id             UUID REFERENCES public.center_needs(id) ON DELETE SET NULL,
  donor_id            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  donor_name          TEXT,  -- Para donantes anónimos o sin cuenta
  items_description   TEXT NOT NULL,
  quantity            INT NOT NULL DEFAULT 1,
  status              pledge_status NOT NULL DEFAULT 'pending',
  estimated_arrival   TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pledges_center ON public.donation_pledges(center_id);
CREATE INDEX idx_pledges_need ON public.donation_pledges(need_id);
CREATE INDEX idx_pledges_donor ON public.donation_pledges(donor_id);
CREATE INDEX idx_pledges_status ON public.donation_pledges(status);

-- -----------------------------------------------------------------------------
-- VISTA: Centros con conteo de necesidades urgentes (optimiza mapa y filtros)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.centers_with_stats AS
SELECT
  c.*,
  COUNT(n.id) FILTER (WHERE n.priority = 'urgent') AS urgent_needs_count,
  COUNT(n.id) FILTER (WHERE n.priority = 'covered') AS covered_needs_count,
  COUNT(n.id) AS total_needs_count,
  COUNT(p.id) FILTER (WHERE p.status IN ('pending', 'in_transit')) AS pending_pledges_count
FROM public.collection_centers c
LEFT JOIN public.center_needs n ON n.center_id = c.id
LEFT JOIN public.donation_pledges p ON p.center_id = c.id
WHERE c.is_active = TRUE
GROUP BY c.id;

-- -----------------------------------------------------------------------------
-- TRIGGERS updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER centers_updated_at
  BEFORE UPDATE ON public.collection_centers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER center_needs_updated_at
  BEFORE UPDATE ON public.center_needs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER pledges_updated_at
  BEFORE UPDATE ON public.donation_pledges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.need_categories ENABLE ROW LEVEL SECURITY;

-- Perfiles: lectura pública limitada, edición propia
CREATE POLICY "Perfiles visibles para usuarios autenticados"
  ON public.profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Usuarios editan su propio perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Centros: lectura pública, escritura solo admins del centro
CREATE POLICY "Centros activos visibles públicamente"
  ON public.collection_centers FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins crean centros"
  ON public.collection_centers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('center_admin', 'volunteer')
    )
  );

CREATE POLICY "Admins actualizan sus centros"
  ON public.collection_centers FOR UPDATE TO authenticated
  USING (manager_id = auth.uid());

-- Necesidades: lectura pública, escritura por admin del centro
CREATE POLICY "Necesidades visibles públicamente"
  ON public.center_needs FOR SELECT USING (TRUE);

CREATE POLICY "Admins gestionan necesidades de su centro"
  ON public.center_needs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collection_centers cc
      WHERE cc.id = center_id AND cc.manager_id = auth.uid()
    )
  );

-- Promesas: donantes crean, admins del centro ven todas las de su centro
CREATE POLICY "Donantes crean promesas"
  ON public.donation_pledges FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Promesas visibles para centro y donante"
  ON public.donation_pledges FOR SELECT
  USING (
    donor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.collection_centers cc
      WHERE cc.id = center_id AND cc.manager_id = auth.uid()
    )
    OR donor_id IS NULL  -- promesas anónimas visibles en agregados
  );

CREATE POLICY "Donantes actualizan sus promesas"
  ON public.donation_pledges FOR UPDATE TO authenticated
  USING (donor_id = auth.uid());

-- Categorías: solo lectura pública
CREATE POLICY "Categorías visibles públicamente"
  ON public.need_categories FOR SELECT USING (TRUE);

-- -----------------------------------------------------------------------------
-- REALTIME (habilitar en Supabase Dashboard > Database > Replication)
-- Tablas: collection_centers, center_needs, donation_pledges
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- DATOS SEMILLA — Categorías y centros de ejemplo en Caracas
-- -----------------------------------------------------------------------------

INSERT INTO public.need_categories (name, slug, icon, sort_order) VALUES
  ('Agua potable', 'agua', 'droplets', 1),
  ('Alimentos no perecederos', 'alimentos', 'utensils', 2),
  ('Medicamentos', 'medicamentos', 'pill', 3),
  ('Ropa y calzado', 'ropa', 'shirt', 4),
  ('Material de construcción', 'construccion', 'hammer', 5),
  ('Colchones y frazadas', 'colchones', 'bed', 6),
  ('Higiene personal', 'higiene', 'sparkles', 7),
  ('Kit de primeros auxilios', 'primeros-auxilios', 'heart-pulse', 8);

-- Centros de ejemplo (Caracas, Venezuela — coordenadas aproximadas)
INSERT INTO public.collection_centers
  (name, description, address, city, state, latitude, longitude, status, schedule, phone)
VALUES
  (
    'Centro de Acopio Parque del Este',
    'Punto principal de recepción en zona este de Caracas.',
    'Av. Francisco de Miranda, Parque del Este',
    'Caracas', 'Distrito Capital',
    10.4901, -66.8534,
    'urgent',
    '{"weekdays": "7:00-19:00", "weekends": "8:00-16:00"}'::jsonb,
    '+58 412-0000001'
  ),
  (
    'Iglesia San Pedro — Acopio Comunitario',
    'Recepción de donaciones para familias afectadas en Catia.',
    'Calle Real de Catia, Parroquia Sucre',
    'Caracas', 'Distrito Capital',
    10.5102, -66.9456,
    'operational',
    '{"weekdays": "9:00-17:00", "weekends": "10:00-14:00"}'::jsonb,
    '+58 414-0000002'
  ),
  (
    'Universidad Central — Punto Solidario',
    'Coordinación estudiantil para ayuda humanitaria.',
    'Ciudad Universitaria, Los Chaguaramos',
    'Caracas', 'Distrito Capital',
    10.4889, -66.8867,
    'full',
    '{"weekdays": "8:00-18:00", "weekends": "cerrado"}'::jsonb,
    '+58 212-0000003'
  );

-- Necesidades de ejemplo
INSERT INTO public.center_needs (center_id, item_name, priority, quantity_needed, unit, notes)
SELECT c.id, 'Agua potable (cajas)', 'urgent', 500, 'cajas', 'Prioridad máxima'
FROM public.collection_centers c WHERE c.name LIKE '%Parque del Este%';

INSERT INTO public.center_needs (center_id, item_name, priority, quantity_needed, unit)
SELECT c.id, 'Medicamentos básicos', 'urgent', 200, 'kits'
FROM public.collection_centers c WHERE c.name LIKE '%Parque del Este%';

INSERT INTO public.center_needs (center_id, item_name, priority, unit, notes)
SELECT c.id, 'Ropa infantil', 'covered', 'bolsas', 'Inventario completo por ahora'
FROM public.collection_centers c WHERE c.name LIKE '%Parque del Este%';

INSERT INTO public.center_needs (center_id, item_name, priority, quantity_needed, unit)
SELECT c.id, 'Arroz y legumbres', 'medium', 300, 'kg'
FROM public.collection_centers c WHERE c.name LIKE '%San Pedro%';

INSERT INTO public.center_needs (center_id, item_name, priority, quantity_needed, unit)
SELECT c.id, 'Colchones', 'urgent', 50, 'unidades'
FROM public.collection_centers c WHERE c.name LIKE '%San Pedro%';

-- Función de búsqueda por proximidad (para "centros cercanos")
CREATE OR REPLACE FUNCTION public.nearby_centers(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 25
)
RETURNS SETOF public.collection_centers AS $$
BEGIN
  RETURN QUERY
  SELECT c.*
  FROM public.collection_centers c
  WHERE c.is_active = TRUE
    AND ST_DWithin(
      c.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY ST_Distance(
    c.location,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql STABLE;
