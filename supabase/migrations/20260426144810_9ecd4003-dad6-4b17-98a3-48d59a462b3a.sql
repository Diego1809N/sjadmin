ALTER TABLE public.servicios_locatario
ADD COLUMN IF NOT EXISTS servicios_detalle jsonb NOT NULL DEFAULT '[]'::jsonb;