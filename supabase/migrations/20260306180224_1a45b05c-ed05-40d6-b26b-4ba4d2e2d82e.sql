
-- TIMESTAMPS FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- LOCADORES
CREATE TABLE public.locadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  dni TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.locadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_locadores" ON public.locadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_locadores" ON public.locadores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_locadores" ON public.locadores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_locadores" ON public.locadores FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_locadores_updated_at BEFORE UPDATE ON public.locadores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROPIEDADES
CREATE TABLE public.propiedades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locador_id UUID REFERENCES public.locadores(id) ON DELETE SET NULL,
  direccion TEXT NOT NULL,
  tipo TEXT,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.propiedades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_propiedades" ON public.propiedades FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_propiedades" ON public.propiedades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_propiedades" ON public.propiedades FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_propiedades" ON public.propiedades FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_propiedades_updated_at BEFORE UPDATE ON public.propiedades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LOCATARIOS
CREATE TABLE public.locatarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  dni TEXT,
  telefono TEXT,
  email TEXT,
  monto_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  fecha_inicio DATE,
  fecha_fin DATE,
  intervalo_ajuste_meses INTEGER DEFAULT 3,
  indice_actualizacion TEXT DEFAULT 'ICL',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.locatarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_locatarios" ON public.locatarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_locatarios" ON public.locatarios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_locatarios" ON public.locatarios FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_locatarios" ON public.locatarios FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_locatarios_updated_at BEFORE UPDATE ON public.locatarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LOCATARIO_PROPIEDADES (many-to-many)
CREATE TABLE public.locatario_propiedades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locatario_id UUID NOT NULL REFERENCES public.locatarios(id) ON DELETE CASCADE,
  propiedad_id UUID NOT NULL REFERENCES public.propiedades(id) ON DELETE CASCADE,
  UNIQUE(locatario_id, propiedad_id)
);
ALTER TABLE public.locatario_propiedades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_lp" ON public.locatario_propiedades FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_lp" ON public.locatario_propiedades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_lp" ON public.locatario_propiedades FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_lp" ON public.locatario_propiedades FOR DELETE TO authenticated USING (true);

-- RECIBOS
CREATE TABLE public.recibos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nro_serie TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  locatario_id UUID REFERENCES public.locatarios(id) ON DELETE SET NULL,
  locatario_nombre TEXT NOT NULL,
  locador_nombre TEXT,
  propiedad TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  expensas NUMERIC(12,2) NOT NULL DEFAULT 0,
  periodo_desde DATE,
  periodo_hasta DATE,
  vencimiento DATE,
  concepto TEXT DEFAULT 'Alquiler mensual',
  estado TEXT NOT NULL DEFAULT 'Pendiente',
  fecha_entrega DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.recibos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_recibos" ON public.recibos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_recibos" ON public.recibos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_recibos" ON public.recibos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_recibos" ON public.recibos FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_recibos_updated_at BEFORE UPDATE ON public.recibos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUTO NRO SERIE
CREATE SEQUENCE public.recibo_nro_serie_seq START 1;
CREATE OR REPLACE FUNCTION public.next_nro_serie()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT := to_char(now(), 'YYYY');
  seq_val INTEGER := nextval('public.recibo_nro_serie_seq');
BEGIN
  RETURN year_part || '-' || lpad(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;
