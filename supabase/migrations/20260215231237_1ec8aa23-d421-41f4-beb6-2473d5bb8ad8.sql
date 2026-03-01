
-- Table for company data
CREATE TABLE IF NOT EXISTS public.dados_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL DEFAULT '',
  nome_fantasia text DEFAULT '',
  cnpj text DEFAULT '',
  inscricao_estadual text DEFAULT '',
  endereco text DEFAULT '',
  cidade text DEFAULT '',
  estado text DEFAULT '',
  cep text DEFAULT '',
  telefone text DEFAULT '',
  whatsapp text DEFAULT '',
  email text DEFAULT '',
  site text DEFAULT '',
  responsavel_nome text DEFAULT '',
  responsavel_cargo text DEFAULT '',
  logo_principal_url text DEFAULT '',
  logo_menu_url text DEFAULT '',
  logo_login_url text DEFAULT '',
  logo_pdf_url text DEFAULT '',
  logo_os_url text DEFAULT '',
  logo_relatorio_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dados_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view empresa" ON public.dados_empresa;
DROP POLICY IF EXISTS "Admins can update empresa" ON public.dados_empresa;
DROP POLICY IF EXISTS "Admins can insert empresa" ON public.dados_empresa;

CREATE POLICY "Authenticated users can view empresa" ON public.dados_empresa FOR SELECT USING (true);
CREATE POLICY "Admins can update empresa" ON public.dados_empresa FOR UPDATE USING (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Admins can insert empresa" ON public.dados_empresa FOR INSERT WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));

-- Insert default row
INSERT INTO public.dados_empresa (razao_social, nome_fantasia)
SELECT 'Minha Empresa', 'Minha Empresa'
WHERE NOT EXISTS (SELECT 1 FROM public.dados_empresa);

-- Table for granular permissions
CREATE TABLE IF NOT EXISTS public.permissoes_granulares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modulo text NOT NULL,
  visualizar boolean DEFAULT true,
  criar boolean DEFAULT false,
  editar boolean DEFAULT false,
  excluir boolean DEFAULT false,
  alterar_status boolean DEFAULT false,
  imprimir boolean DEFAULT false,
  exportar boolean DEFAULT false,
  importar boolean DEFAULT false,
  acessar_indicadores boolean DEFAULT false,
  acessar_historico boolean DEFAULT false,
  ver_valores boolean DEFAULT false,
  ver_custos boolean DEFAULT false,
  ver_criticidade boolean DEFAULT true,
  ver_status boolean DEFAULT true,
  ver_obs_internas boolean DEFAULT false,
  ver_dados_financeiros boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, modulo)
);

ALTER TABLE public.permissoes_granulares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage permissions" ON public.permissoes_granulares;
DROP POLICY IF EXISTS "Users can view own permissions" ON public.permissoes_granulares;

CREATE POLICY "Admins can manage permissions" ON public.permissoes_granulares FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Users can view own permissions" ON public.permissoes_granulares FOR SELECT USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_dados_empresa_updated_at ON public.dados_empresa;
DROP TRIGGER IF EXISTS update_permissoes_granulares_updated_at ON public.permissoes_granulares;
CREATE TRIGGER update_dados_empresa_updated_at BEFORE UPDATE ON public.dados_empresa FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_permissoes_granulares_updated_at BEFORE UPDATE ON public.permissoes_granulares FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
SELECT 'logos', 'logos', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'logos');

DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete logos" ON storage.objects;

CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Admins can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Admins can update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'logos');
CREATE POLICY "Admins can delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'logos');
