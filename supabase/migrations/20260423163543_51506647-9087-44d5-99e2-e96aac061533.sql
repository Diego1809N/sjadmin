-- Tabla para gestionar qué servicios paga cada locatario por propiedad
CREATE TABLE public.servicios_locatario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locatario_id UUID NOT NULL REFERENCES public.locatarios(id) ON DELETE CASCADE,
  propiedad_id UUID REFERENCES public.propiedades(id) ON DELETE CASCADE,
  servicios TEXT[] NOT NULL DEFAULT '{}',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.servicios_locatario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_servicios" ON public.servicios_locatario FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_servicios" ON public.servicios_locatario FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_servicios" ON public.servicios_locatario FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_servicios" ON public.servicios_locatario FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_servicios_locatario_updated_at
BEFORE UPDATE ON public.servicios_locatario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_servicios_locatario_id ON public.servicios_locatario(locatario_id);
CREATE INDEX idx_servicios_propiedad_id ON public.servicios_locatario(propiedad_id);