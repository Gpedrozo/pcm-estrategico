-- Migration: dispositivos_moveis + qrcodes_vinculacao
-- Suporte a vinculação de dispositivos móveis por QR Code (multi-tenant)

-- Tabela de dispositivos vinculados
CREATE TABLE IF NOT EXISTS public.dispositivos_moveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_nome TEXT,
  device_os TEXT,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  mecanico_ultimo_id UUID REFERENCES public.mecanicos(id) ON DELETE SET NULL,
  ultimo_acesso TIMESTAMPTZ,
  ultimo_ip TEXT,
  os_pendentes_offline INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  desativado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  desativado_em TIMESTAMPTZ,
  motivo_desativacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, device_id)
);

-- Tabela de QR Codes de vinculação
CREATE TABLE IF NOT EXISTS public.qrcodes_vinculacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'MULTIPLO' CHECK (tipo IN ('UNICO', 'MULTIPLO')),
  usos INT DEFAULT 0,
  max_usos INT,
  expira_em TIMESTAMPTZ,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(token)
);

-- Configuração de limites por empresa
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS max_dispositivos_moveis INT DEFAULT 10,
  ADD COLUMN IF NOT EXISTS dispositivos_moveis_ativos BOOLEAN DEFAULT true;

-- RLS
ALTER TABLE public.dispositivos_moveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qrcodes_vinculacao ENABLE ROW LEVEL SECURITY;

-- Policies dispositivos_moveis
CREATE POLICY "dispositivos_moveis_tenant_read"
  ON public.dispositivos_moveis FOR SELECT
  USING (empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "dispositivos_moveis_tenant_insert"
  ON public.dispositivos_moveis FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "dispositivos_moveis_tenant_update"
  ON public.dispositivos_moveis FOR UPDATE
  USING (empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "dispositivos_moveis_tenant_delete"
  ON public.dispositivos_moveis FOR DELETE
  USING (empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Policies qrcodes_vinculacao
CREATE POLICY "qrcodes_vinculacao_tenant_read"
  ON public.qrcodes_vinculacao FOR SELECT
  USING (empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "qrcodes_vinculacao_tenant_insert"
  ON public.qrcodes_vinculacao FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "qrcodes_vinculacao_tenant_update"
  ON public.qrcodes_vinculacao FOR UPDATE
  USING (empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "qrcodes_vinculacao_tenant_delete"
  ON public.qrcodes_vinculacao FOR DELETE
  USING (empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Owner pode ver tudo
CREATE POLICY "dispositivos_moveis_owner_read"
  ON public.dispositivos_moveis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

CREATE POLICY "dispositivos_moveis_owner_update"
  ON public.dispositivos_moveis FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

CREATE POLICY "qrcodes_vinculacao_owner_all"
  ON public.qrcodes_vinculacao FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

-- RPC: vincular dispositivo via token QR (chamado pelo app)
CREATE OR REPLACE FUNCTION public.vincular_dispositivo(
  p_qr_token UUID,
  p_device_id TEXT,
  p_device_nome TEXT DEFAULT NULL,
  p_device_os TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr qrcodes_vinculacao;
  v_empresa empresas;
  v_device dispositivos_moveis;
  v_count INT;
BEGIN
  -- Busca QR
  SELECT * INTO v_qr FROM qrcodes_vinculacao
    WHERE token = p_qr_token AND ativo = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'QR Code inválido ou revogado');
  END IF;

  -- Verifica expiração
  IF v_qr.expira_em IS NOT NULL AND v_qr.expira_em < now() THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'QR Code expirado');
  END IF;

  -- Verifica tipo UNICO já usado
  IF v_qr.tipo = 'UNICO' AND v_qr.usos > 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'QR Code de uso único já utilizado');
  END IF;

  -- Verifica max_usos
  IF v_qr.max_usos IS NOT NULL AND v_qr.usos >= v_qr.max_usos THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Limite de usos deste QR atingido');
  END IF;

  -- Busca empresa
  SELECT * INTO v_empresa FROM empresas WHERE id = v_qr.empresa_id;
  IF NOT FOUND OR v_empresa.dispositivos_moveis_ativos IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Dispositivos móveis desativados para esta empresa');
  END IF;

  -- Verifica limite de dispositivos
  SELECT count(*) INTO v_count FROM dispositivos_moveis
    WHERE empresa_id = v_empresa.id AND ativo = true;
  IF v_count >= COALESCE(v_empresa.max_dispositivos_moveis, 10) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Limite de dispositivos atingido (' || v_empresa.max_dispositivos_moveis || ')');
  END IF;

  -- Verifica se device_id já está vinculado a esta empresa
  SELECT * INTO v_device FROM dispositivos_moveis
    WHERE empresa_id = v_empresa.id AND device_id = p_device_id;

  IF FOUND THEN
    -- Reativa se desativado
    UPDATE dispositivos_moveis SET
      ativo = true,
      device_nome = COALESCE(p_device_nome, device_nome),
      device_os = COALESCE(p_device_os, device_os),
      desativado_por = NULL,
      desativado_em = NULL,
      motivo_desativacao = NULL,
      ultimo_acesso = now()
    WHERE id = v_device.id
    RETURNING * INTO v_device;
  ELSE
    INSERT INTO dispositivos_moveis (empresa_id, device_id, device_nome, device_os, ultimo_acesso)
    VALUES (v_empresa.id, p_device_id, p_device_nome, p_device_os, now())
    RETURNING * INTO v_device;
  END IF;

  -- Incrementa uso do QR
  UPDATE qrcodes_vinculacao SET usos = usos + 1 WHERE id = v_qr.id;
  IF v_qr.tipo = 'UNICO' THEN
    UPDATE qrcodes_vinculacao SET ativo = false WHERE id = v_qr.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'device_token', v_device.token,
    'empresa_id', v_empresa.id,
    'empresa_nome', COALESCE(v_empresa.nome_fantasia, v_empresa.razao_social),
    'tenant_slug', v_empresa.slug
  );
END;
$$;

-- RPC: verificar se dispositivo está ativo (chamado pelo app a cada abertura)
CREATE OR REPLACE FUNCTION public.verificar_dispositivo(p_device_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device dispositivos_moveis;
  v_empresa empresas;
BEGIN
  SELECT * INTO v_device FROM dispositivos_moveis WHERE token = p_device_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 'NAO_ENCONTRADO');
  END IF;

  SELECT * INTO v_empresa FROM empresas WHERE id = v_device.empresa_id;

  IF NOT v_device.ativo THEN
    RETURN jsonb_build_object('ok', false, 'status', 'DESATIVADO',
      'motivo', v_device.motivo_desativacao);
  END IF;

  IF v_empresa.dispositivos_moveis_ativos IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'status', 'EMPRESA_DESATIVOU');
  END IF;

  -- Atualiza último acesso
  UPDATE dispositivos_moveis SET ultimo_acesso = now() WHERE id = v_device.id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'ATIVO',
    'empresa_id', v_empresa.id,
    'empresa_nome', COALESCE(v_empresa.nome_fantasia, v_empresa.razao_social),
    'tenant_slug', v_empresa.slug
  );
END;
$$;
