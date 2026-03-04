BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_empresa_id_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.get_current_empresa_id();
  END IF;

  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id is required';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.block_empresa_id_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
    RAISE EXCEPTION 'Updating empresa_id is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_table text;
BEGIN
  FOR v_table IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'empresa_id'
      AND c.is_nullable = 'NO'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_empresa_id_insert ON public.%I', v_table);
    EXECUTE format('CREATE TRIGGER trg_enforce_empresa_id_insert BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_empresa_id_insert()', v_table);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_block_empresa_id_update ON public.%I', v_table);
    EXECUTE format('CREATE TRIGGER trg_block_empresa_id_update BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.block_empresa_id_update()', v_table);
  END LOOP;
END $$;

COMMIT;
