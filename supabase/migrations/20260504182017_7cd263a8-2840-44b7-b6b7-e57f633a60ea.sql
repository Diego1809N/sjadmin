CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  locador_nombre text NOT NULL,
  locador_dni text,
  locador_domicilio text,
  locatario_nombre text NOT NULL,
  locatario_dni text,
  locatario_domicilio text,
  propiedad_direccion text NOT NULL,
  propiedad_descripcion text,
  fecha_inicio date,
  fecha_fin date,
  plazo_meses integer,
  monto numeric NOT NULL DEFAULT 0,
  deposito numeric DEFAULT 0,
  indice_ajuste text,
  intervalo_ajuste_meses integer,
  garantias text,
  destino text,
  observaciones text,
  datos_extra jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_contratos" ON public.contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_contratos" ON public.contratos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_contratos" ON public.contratos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_contratos" ON public.contratos FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_contratos_updated_at
BEFORE UPDATE ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();