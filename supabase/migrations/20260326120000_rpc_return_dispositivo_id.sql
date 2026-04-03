-- Migration: Add dispositivo_id to vincular_dispositivo and verificar_dispositivo RPC returns
-- Reason: MecanicoHome.tsx login requires dispositivo_id but RPCs did not return it.

-- ─── vincular_dispositivo: add dispositivo_id to return ───

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
  SELECT * INTO v_qr FROM qrcodes_vinculacao
    WHERE token = p_qr_token AND ativo = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'QR Code inválido ou revogado');
  END IF;

  IF v_qr.expira_em IS NOT NULL AND v_qr.expira_em < now() THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'QR Code expirado');
  END IF;

  IF v_qr.tipo = 'UNICO' AND v_qr.usos > 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'QR Code de uso único já utilizado');
  END IF;

  IF v_qr.max_usos IS NOT NULL AND v_qr.usos >= v_qr.max_usos THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Limite de usos deste QR atingido');
  END IF;

  SELECT * INTO v_empresa FROM empresas WHERE id = v_qr.empresa_id;
  IF NOT FOUND OR v_empresa.dispositivos_moveis_ativos IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Dispositivos móveis desativados para esta empresa');
  END IF;

  SELECT count(*) INTO v_count FROM dispositivos_moveis
    WHERE empresa_id = v_empresa.id AND ativo = true;
  IF v_count >= COALESCE(v_empresa.max_dispositivos_moveis, 10) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Limite de dispositivos atingido (' || v_empresa.max_dispositivos_moveis || ')');
  END IF;

  SELECT * INTO v_device FROM dispositivos_moveis
    WHERE empresa_id = v_empresa.id AND device_id = p_device_id;

  IF FOUND THEN
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

  UPDATE qrcodes_vinculacao SET usos = usos + 1 WHERE id = v_qr.id;
  IF v_qr.tipo = 'UNICO' THEN
    UPDATE qrcodes_vinculacao SET ativo = false WHERE id = v_qr.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'device_token', v_device.token,
    'dispositivo_id', v_device.id,
    'empresa_id', v_empresa.id,
    'empresa_nome', v_empresa.nome,
    'tenant_slug', v_empresa.slug
  );
END;
$$;

-- ─── verificar_dispositivo: add dispositivo_id to return ───

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
      'motivo', v_device.motivo_desativacao,
      'empresa_nome', COALESCE(v_empresa.nome, ''));
  END IF;

  IF v_empresa.dispositivos_moveis_ativos IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'status', 'EMPRESA_DESATIVOU',
      'empresa_nome', v_empresa.nome);
  END IF;

  UPDATE dispositivos_moveis SET ultimo_acesso = now() WHERE id = v_device.id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'ATIVO',
    'dispositivo_id', v_device.id,
    'empresa_id', v_empresa.id,
    'empresa_nome', v_empresa.nome,
    'tenant_slug', v_empresa.slug
  );
END;
$$;
