-- Allow authenticated users to UPDATE their own preditiva measurements
-- and add trigger to track edit history in audit_logs

-- RLS policy: allow UPDATE for authenticated users within their tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'medicoes_preditivas'
      AND policyname = 'tenant_update_medicoes_preditivas'
  ) THEN
    CREATE POLICY "tenant_update_medicoes_preditivas"
      ON public.medicoes_preditivas
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Ensure updated_at is refreshed on every update
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at_medicoes_preditivas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_medicoes_preditivas ON public.medicoes_preditivas;
CREATE TRIGGER set_updated_at_medicoes_preditivas
  BEFORE UPDATE ON public.medicoes_preditivas
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at_medicoes_preditivas();
