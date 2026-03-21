BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'operational_logs_empresa_id_fkey'
      AND conrelid = 'public.operational_logs'::regclass
  ) THEN
    ALTER TABLE public.operational_logs
      DROP CONSTRAINT operational_logs_empresa_id_fkey;
  END IF;
END;
$$;

ALTER TABLE public.operational_logs
  ADD CONSTRAINT operational_logs_empresa_id_fkey
  FOREIGN KEY (empresa_id)
  REFERENCES public.empresas(id)
  ON DELETE CASCADE;

COMMIT;
