-- RPC: Dado o codigo_acesso do mecânico, retorna o empresa_id correspondente.
-- Usado pelo Portal do Mecânico (web) para resolver o tenant quando o acesso é feito
-- pelo domínio base (sem subdomínio).
-- SECURITY DEFINER para bypassar RLS (anon não tem policy SELECT em mecanicos).
-- Retorna apenas o UUID da empresa — a autenticação real continua via validar_credenciais_mecanico_servidor.

CREATE OR REPLACE FUNCTION public.resolver_empresa_mecanico(p_codigo_acesso text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  SELECT empresa_id INTO v_empresa_id
    FROM mecanicos
   WHERE UPPER(codigo_acesso) = UPPER(TRIM(p_codigo_acesso))
     AND ativo = true
   LIMIT 1;

  RETURN v_empresa_id; -- NULL se não encontrar
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolver_empresa_mecanico(text) TO anon, authenticated;
