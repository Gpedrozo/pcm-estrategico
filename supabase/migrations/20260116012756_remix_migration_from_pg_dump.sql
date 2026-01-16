CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'ADMIN',
    'USUARIO'
);


--
-- Name: deduzir_estoque_os(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deduzir_estoque_os() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    UPDATE public.materiais 
    SET estoque_atual = estoque_atual - NEW.quantidade,
        updated_at = now()
    WHERE id = NEW.material_id;
    
    RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'USUARIO');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: update_estoque_material(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_estoque_material() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NEW.tipo = 'ENTRADA' THEN
        UPDATE public.materiais 
        SET estoque_atual = estoque_atual + NEW.quantidade,
            updated_at = now()
        WHERE id = NEW.material_id;
    ELSIF NEW.tipo = 'SAIDA' THEN
        UPDATE public.materiais 
        SET estoque_atual = estoque_atual - NEW.quantidade,
            updated_at = now()
        WHERE id = NEW.material_id;
    ELSIF NEW.tipo = 'AJUSTE' THEN
        UPDATE public.materiais 
        SET estoque_atual = NEW.quantidade,
            updated_at = now()
        WHERE id = NEW.material_id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    planta_id uuid NOT NULL,
    codigo text NOT NULL,
    nome text NOT NULL,
    descricao text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    usuario_nome text NOT NULL,
    acao text NOT NULL,
    descricao text NOT NULL,
    tag text,
    data_hora timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: equipamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tag text NOT NULL,
    nome text NOT NULL,
    criticidade text DEFAULT 'C'::text NOT NULL,
    nivel_risco text DEFAULT 'BAIXO'::text NOT NULL,
    localizacao text,
    fabricante text,
    modelo text,
    numero_serie text,
    data_instalacao date,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sistema_id uuid,
    CONSTRAINT equipamentos_criticidade_check CHECK ((criticidade = ANY (ARRAY['A'::text, 'B'::text, 'C'::text]))),
    CONSTRAINT equipamentos_nivel_risco_check CHECK ((nivel_risco = ANY (ARRAY['CRITICO'::text, 'ALTO'::text, 'MEDIO'::text, 'BAIXO'::text])))
);


--
-- Name: execucoes_os; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.execucoes_os (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_id uuid NOT NULL,
    mecanico_id uuid,
    mecanico_nome text NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fim time without time zone NOT NULL,
    tempo_execucao integer NOT NULL,
    servico_executado text NOT NULL,
    custo_mao_obra numeric(10,2) DEFAULT 0,
    custo_materiais numeric(10,2) DEFAULT 0,
    custo_terceiros numeric(10,2) DEFAULT 0,
    custo_total numeric(10,2) DEFAULT 0,
    data_execucao date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: materiais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materiais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text NOT NULL,
    nome text NOT NULL,
    unidade text DEFAULT 'UN'::text NOT NULL,
    estoque_atual numeric(10,2) DEFAULT 0 NOT NULL,
    estoque_minimo numeric(10,2) DEFAULT 0 NOT NULL,
    custo_unitario numeric(10,2) DEFAULT 0 NOT NULL,
    localizacao text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: materiais_os; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materiais_os (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_id uuid NOT NULL,
    material_id uuid NOT NULL,
    quantidade numeric NOT NULL,
    custo_unitario numeric NOT NULL,
    custo_total numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mecanicos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mecanicos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    telefone text,
    tipo text DEFAULT 'PROPRIO'::text NOT NULL,
    especialidade text,
    custo_hora numeric(10,2),
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mecanicos_tipo_check CHECK ((tipo = ANY (ARRAY['PROPRIO'::text, 'TERCEIRIZADO'::text])))
);


--
-- Name: movimentacoes_materiais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimentacoes_materiais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid NOT NULL,
    os_id uuid,
    tipo text NOT NULL,
    quantidade numeric NOT NULL,
    custo_unitario numeric,
    custo_total numeric,
    observacao text,
    usuario_id uuid,
    usuario_nome text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT movimentacoes_materiais_tipo_check CHECK ((tipo = ANY (ARRAY['ENTRADA'::text, 'SAIDA'::text, 'AJUSTE'::text])))
);


--
-- Name: ordens_servico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ordens_servico (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_os integer NOT NULL,
    tipo text DEFAULT 'CORRETIVA'::text NOT NULL,
    prioridade text DEFAULT 'MEDIA'::text NOT NULL,
    tag text NOT NULL,
    equipamento text NOT NULL,
    solicitante text NOT NULL,
    problema text NOT NULL,
    data_solicitacao timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'ABERTA'::text NOT NULL,
    usuario_abertura uuid,
    data_fechamento timestamp with time zone,
    usuario_fechamento uuid,
    tempo_estimado integer,
    custo_estimado numeric(10,2),
    modo_falha text,
    causa_raiz text,
    acao_corretiva text,
    licoes_aprendidas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ordens_servico_prioridade_check CHECK ((prioridade = ANY (ARRAY['URGENTE'::text, 'ALTA'::text, 'MEDIA'::text, 'BAIXA'::text]))),
    CONSTRAINT ordens_servico_status_check CHECK ((status = ANY (ARRAY['ABERTA'::text, 'EM_ANDAMENTO'::text, 'AGUARDANDO_MATERIAL'::text, 'AGUARDANDO_APROVACAO'::text, 'FECHADA'::text]))),
    CONSTRAINT ordens_servico_tipo_check CHECK ((tipo = ANY (ARRAY['CORRETIVA'::text, 'PREVENTIVA'::text, 'PREDITIVA'::text, 'INSPECAO'::text, 'MELHORIA'::text])))
);


--
-- Name: ordens_servico_numero_os_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ordens_servico_numero_os_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ordens_servico_numero_os_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ordens_servico_numero_os_seq OWNED BY public.ordens_servico.numero_os;


--
-- Name: plantas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plantas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text NOT NULL,
    nome text NOT NULL,
    endereco text,
    responsavel text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nome text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sistemas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sistemas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    area_id uuid NOT NULL,
    codigo text NOT NULL,
    nome text NOT NULL,
    descricao text,
    funcao_principal text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'USUARIO'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ordens_servico numero_os; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_servico ALTER COLUMN numero_os SET DEFAULT nextval('public.ordens_servico_numero_os_seq'::regclass);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: areas areas_planta_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_planta_id_codigo_key UNIQUE (planta_id, codigo);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


--
-- Name: equipamentos equipamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipamentos
    ADD CONSTRAINT equipamentos_pkey PRIMARY KEY (id);


--
-- Name: equipamentos equipamentos_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipamentos
    ADD CONSTRAINT equipamentos_tag_key UNIQUE (tag);


--
-- Name: execucoes_os execucoes_os_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execucoes_os
    ADD CONSTRAINT execucoes_os_pkey PRIMARY KEY (id);


--
-- Name: materiais materiais_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materiais
    ADD CONSTRAINT materiais_codigo_key UNIQUE (codigo);


--
-- Name: materiais_os materiais_os_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materiais_os
    ADD CONSTRAINT materiais_os_pkey PRIMARY KEY (id);


--
-- Name: materiais materiais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materiais
    ADD CONSTRAINT materiais_pkey PRIMARY KEY (id);


--
-- Name: mecanicos mecanicos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mecanicos
    ADD CONSTRAINT mecanicos_pkey PRIMARY KEY (id);


--
-- Name: movimentacoes_materiais movimentacoes_materiais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentacoes_materiais
    ADD CONSTRAINT movimentacoes_materiais_pkey PRIMARY KEY (id);


--
-- Name: ordens_servico ordens_servico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_servico
    ADD CONSTRAINT ordens_servico_pkey PRIMARY KEY (id);


--
-- Name: plantas plantas_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantas
    ADD CONSTRAINT plantas_codigo_key UNIQUE (codigo);


--
-- Name: plantas plantas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantas
    ADD CONSTRAINT plantas_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: sistemas sistemas_area_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistemas
    ADD CONSTRAINT sistemas_area_id_codigo_key UNIQUE (area_id, codigo);


--
-- Name: sistemas sistemas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistemas
    ADD CONSTRAINT sistemas_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: materiais_os trigger_deduzir_estoque_os; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_deduzir_estoque_os AFTER INSERT ON public.materiais_os FOR EACH ROW EXECUTE FUNCTION public.deduzir_estoque_os();


--
-- Name: movimentacoes_materiais trigger_update_estoque; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_estoque AFTER INSERT ON public.movimentacoes_materiais FOR EACH ROW EXECUTE FUNCTION public.update_estoque_material();


--
-- Name: areas update_areas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: equipamentos update_equipamentos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_equipamentos_updated_at BEFORE UPDATE ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: materiais update_materiais_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_materiais_updated_at BEFORE UPDATE ON public.materiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mecanicos update_mecanicos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mecanicos_updated_at BEFORE UPDATE ON public.mecanicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ordens_servico update_ordens_servico_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ordens_servico_updated_at BEFORE UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plantas update_plantas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plantas_updated_at BEFORE UPDATE ON public.plantas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sistemas update_sistemas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sistemas_updated_at BEFORE UPDATE ON public.sistemas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: areas areas_planta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_planta_id_fkey FOREIGN KEY (planta_id) REFERENCES public.plantas(id) ON DELETE CASCADE;


--
-- Name: auditoria auditoria_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id);


--
-- Name: equipamentos equipamentos_sistema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipamentos
    ADD CONSTRAINT equipamentos_sistema_id_fkey FOREIGN KEY (sistema_id) REFERENCES public.sistemas(id) ON DELETE SET NULL;


--
-- Name: execucoes_os execucoes_os_mecanico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execucoes_os
    ADD CONSTRAINT execucoes_os_mecanico_id_fkey FOREIGN KEY (mecanico_id) REFERENCES public.mecanicos(id);


--
-- Name: execucoes_os execucoes_os_os_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execucoes_os
    ADD CONSTRAINT execucoes_os_os_id_fkey FOREIGN KEY (os_id) REFERENCES public.ordens_servico(id) ON DELETE CASCADE;


--
-- Name: materiais_os materiais_os_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materiais_os
    ADD CONSTRAINT materiais_os_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materiais(id) ON DELETE CASCADE;


--
-- Name: materiais_os materiais_os_os_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materiais_os
    ADD CONSTRAINT materiais_os_os_id_fkey FOREIGN KEY (os_id) REFERENCES public.ordens_servico(id) ON DELETE CASCADE;


--
-- Name: movimentacoes_materiais movimentacoes_materiais_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentacoes_materiais
    ADD CONSTRAINT movimentacoes_materiais_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materiais(id) ON DELETE CASCADE;


--
-- Name: movimentacoes_materiais movimentacoes_materiais_os_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentacoes_materiais
    ADD CONSTRAINT movimentacoes_materiais_os_id_fkey FOREIGN KEY (os_id) REFERENCES public.ordens_servico(id) ON DELETE SET NULL;


--
-- Name: ordens_servico ordens_servico_tag_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_servico
    ADD CONSTRAINT ordens_servico_tag_fkey FOREIGN KEY (tag) REFERENCES public.equipamentos(tag);


--
-- Name: ordens_servico ordens_servico_usuario_abertura_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_servico
    ADD CONSTRAINT ordens_servico_usuario_abertura_fkey FOREIGN KEY (usuario_abertura) REFERENCES auth.users(id);


--
-- Name: ordens_servico ordens_servico_usuario_fechamento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_servico
    ADD CONSTRAINT ordens_servico_usuario_fechamento_fkey FOREIGN KEY (usuario_fechamento) REFERENCES auth.users(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sistemas sistemas_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistemas
    ADD CONSTRAINT sistemas_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: areas Admins can manage areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage areas" ON public.areas USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: equipamentos Admins can manage equipamentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage equipamentos" ON public.equipamentos TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: plantas Admins can manage plantas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage plantas" ON public.plantas USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: sistemas Admins can manage sistemas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sistemas" ON public.sistemas USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: ordens_servico Authenticated users can create ordens_servico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create ordens_servico" ON public.ordens_servico FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: movimentacoes_materiais Authenticated users can insert movimentacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert movimentacoes" ON public.movimentacoes_materiais FOR INSERT WITH CHECK (true);


--
-- Name: execucoes_os Authenticated users can manage execucoes_os; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage execucoes_os" ON public.execucoes_os TO authenticated USING (true);


--
-- Name: materiais Authenticated users can manage materiais; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage materiais" ON public.materiais TO authenticated USING (true);


--
-- Name: materiais_os Authenticated users can manage materiais_os; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage materiais_os" ON public.materiais_os USING (true);


--
-- Name: mecanicos Authenticated users can manage mecanicos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage mecanicos" ON public.mecanicos TO authenticated USING (true);


--
-- Name: ordens_servico Authenticated users can update ordens_servico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update ordens_servico" ON public.ordens_servico FOR UPDATE TO authenticated USING (true);


--
-- Name: areas Authenticated users can view areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view areas" ON public.areas FOR SELECT USING (true);


--
-- Name: auditoria Authenticated users can view auditoria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view auditoria" ON public.auditoria FOR SELECT TO authenticated USING (true);


--
-- Name: equipamentos Authenticated users can view equipamentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view equipamentos" ON public.equipamentos FOR SELECT TO authenticated USING (true);


--
-- Name: execucoes_os Authenticated users can view execucoes_os; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view execucoes_os" ON public.execucoes_os FOR SELECT TO authenticated USING (true);


--
-- Name: materiais Authenticated users can view materiais; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view materiais" ON public.materiais FOR SELECT TO authenticated USING (true);


--
-- Name: materiais_os Authenticated users can view materiais_os; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view materiais_os" ON public.materiais_os FOR SELECT USING (true);


--
-- Name: mecanicos Authenticated users can view mecanicos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view mecanicos" ON public.mecanicos FOR SELECT TO authenticated USING (true);


--
-- Name: movimentacoes_materiais Authenticated users can view movimentacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view movimentacoes" ON public.movimentacoes_materiais FOR SELECT USING (true);


--
-- Name: ordens_servico Authenticated users can view ordens_servico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view ordens_servico" ON public.ordens_servico FOR SELECT TO authenticated USING (true);


--
-- Name: plantas Authenticated users can view plantas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view plantas" ON public.plantas FOR SELECT USING (true);


--
-- Name: sistemas Authenticated users can view sistemas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view sistemas" ON public.sistemas FOR SELECT USING (true);


--
-- Name: auditoria System can insert auditoria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert auditoria" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: areas Users can insert areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert areas" ON public.areas FOR INSERT WITH CHECK (true);


--
-- Name: equipamentos Users can insert equipamentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert equipamentos" ON public.equipamentos FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: plantas Users can insert plantas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert plantas" ON public.plantas FOR INSERT WITH CHECK (true);


--
-- Name: sistemas Users can insert sistemas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert sistemas" ON public.sistemas FOR INSERT WITH CHECK (true);


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: areas Users can update areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update areas" ON public.areas FOR UPDATE USING (true);


--
-- Name: equipamentos Users can update equipamentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update equipamentos" ON public.equipamentos FOR UPDATE TO authenticated USING (true);


--
-- Name: plantas Users can update plantas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update plantas" ON public.plantas FOR UPDATE USING (true);


--
-- Name: sistemas Users can update sistemas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update sistemas" ON public.sistemas FOR UPDATE USING (true);


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: areas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

--
-- Name: auditoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

--
-- Name: equipamentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;

--
-- Name: execucoes_os; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.execucoes_os ENABLE ROW LEVEL SECURITY;

--
-- Name: materiais; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;

--
-- Name: materiais_os; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.materiais_os ENABLE ROW LEVEL SECURITY;

--
-- Name: mecanicos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mecanicos ENABLE ROW LEVEL SECURITY;

--
-- Name: movimentacoes_materiais; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movimentacoes_materiais ENABLE ROW LEVEL SECURITY;

--
-- Name: ordens_servico; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

--
-- Name: plantas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plantas ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: sistemas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sistemas ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;