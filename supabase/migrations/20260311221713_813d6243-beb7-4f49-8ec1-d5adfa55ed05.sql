
-- Drop existing FK and re-add with ON DELETE CASCADE so deleting a locatario removes their locatario_propiedades rows
ALTER TABLE public.locatario_propiedades
  DROP CONSTRAINT IF EXISTS locatario_propiedades_locatario_id_fkey;

ALTER TABLE public.locatario_propiedades
  ADD CONSTRAINT locatario_propiedades_locatario_id_fkey
  FOREIGN KEY (locatario_id)
  REFERENCES public.locatarios(id)
  ON DELETE CASCADE;
