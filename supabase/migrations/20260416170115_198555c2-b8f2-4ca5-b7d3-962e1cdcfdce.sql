
CREATE TABLE public.historial_precios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locatario_id uuid NOT NULL REFERENCES public.locatarios(id) ON DELETE CASCADE,
  propiedad_id uuid REFERENCES public.propiedades(id) ON DELETE SET NULL,
  monto numeric NOT NULL,
  fecha_desde date NOT NULL DEFAULT CURRENT_DATE,
  fecha_hasta date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historial_precios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_historial" ON public.historial_precios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_historial" ON public.historial_precios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_delete_historial" ON public.historial_precios FOR DELETE TO authenticated USING (true);
