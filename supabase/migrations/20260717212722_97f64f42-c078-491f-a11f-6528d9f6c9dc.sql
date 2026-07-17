
CREATE TABLE public.cambios_pendientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  entidad_tabla TEXT NOT NULL,
  entidad_id UUID,
  descripcion TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  motivo_rechazo TEXT,
  creado_por TEXT,
  resuelto_por TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cambios_pendientes_estado_idx ON public.cambios_pendientes (estado);
CREATE INDEX cambios_pendientes_entidad_idx ON public.cambios_pendientes (entidad_tabla, entidad_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cambios_pendientes TO authenticated;
GRANT SELECT ON public.cambios_pendientes TO anon;
GRANT ALL ON public.cambios_pendientes TO service_role;

ALTER TABLE public.cambios_pendientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cambios_pendientes_all_select" ON public.cambios_pendientes FOR SELECT USING (true);
CREATE POLICY "cambios_pendientes_all_insert" ON public.cambios_pendientes FOR INSERT WITH CHECK (true);
CREATE POLICY "cambios_pendientes_all_update" ON public.cambios_pendientes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "cambios_pendientes_all_delete" ON public.cambios_pendientes FOR DELETE USING (true);

CREATE TRIGGER update_cambios_pendientes_updated_at
BEFORE UPDATE ON public.cambios_pendientes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
