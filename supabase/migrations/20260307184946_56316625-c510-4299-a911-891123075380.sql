
-- Add contract info fields to locatario_propiedades (per-property contract details)
ALTER TABLE public.locatario_propiedades
  ADD COLUMN IF NOT EXISTS fecha_inicio date,
  ADD COLUMN IF NOT EXISTS fecha_fin date,
  ADD COLUMN IF NOT EXISTS monto_base numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intervalo_ajuste_meses integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS indice_actualizacion text DEFAULT 'ICL',
  ADD COLUMN IF NOT EXISTS notas text;

-- Add individual concept columns to recibos for multi-concept receipts
ALTER TABLE public.recibos
  ADD COLUMN IF NOT EXISTS agua numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS luz numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gas numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arreglos numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS servicios numeric NOT NULL DEFAULT 0;
