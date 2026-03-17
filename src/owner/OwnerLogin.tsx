import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getPostLoginPath } from '@/lib/security';
import { resolveOrRepairTenantHost } from '@/lib/tenantDomain';
import { getImpersonationExpiresAt, getImpersonationPayload, impersonateCompany, listPlatformCompanies, type OwnerCompany } from '@/services/ownerPortal.service';
import { createSessionTransferCode } from '@/lib/sessionTransfer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { z } from 'zod';

const SESSION_TRANSFER_REDIRECT_STORAGE_KEY = 'pcm.auth.session_transfer.redirect.v1';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(5, 'Email inválido')
    .max(255, 'Email muito longo')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha muito longa'),
});

export default function OwnerLogin() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [logoutNotice, setLogoutNotice] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showAccessChooser, setShowAccessChooser] = useState(false);
  const [isChooserLoading, setIsChooserLoading] = useState(false);
  const [isChoosingAccess, setIsChoosingAccess] = useState(false);
  const [companies, setCompanies] = useState<OwnerCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const { login, logout, user, session, isAuthenticated, isLoading, effectiveRole, forcePasswordChange, startImpersonationSession } = useAuth();
  const navigate = useNavigate();

  const isOwnerRole = effectiveRole === 'SYSTEM_OWNER' || effectiveRole === 'SYSTEM_ADMIN';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasLogoutMarker = params.get('logout') === '1';
    const reason = params.get('reason');

    if (reason === 'inactivity') {
      setLogoutNotice('Usuário desconectado por inatividade (10 minutos sem atividade). Faça login novamente.');
    } else if (reason === 'window_closed') {
      setLogoutNotice('Sessão encerrada ao fechar a página. Faça login novamente para continuar.');
    }

    if (!hasLogoutMarker && !reason) return;

    params.delete('logout');
    params.delete('reason');
    const nextQuery = params.toString();
    const cleanedUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanedUrl);
  }, []);

  const tenantBaseDomain = (import.meta.env.VITE_TENANT_BASE_DOMAIN || '').trim().toLowerCase();

  const loadCompaniesForChooser = async () => {
    setIsChooserLoading(true);
    try {
      const data = await listPlatformCompanies();
      const list = Array.isArray(data?.companies) ? data.companies : [];
      setCompanies(list);

      if (list.length > 0) {
        setSelectedCompanyId((prev) => prev || String(list[0]?.id || ''));
      }
    } catch (err: any) {
      setLoginError(String(err?.message ?? 'Falha ao carregar empresas para acesso do owner.'));
    } finally {
      setIsChooserLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (!forcePasswordChange) return;
    navigate('/change-password', { replace: true });
  }, [forcePasswordChange, isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !isOwnerRole) return;

    setShowAccessChooser(true);
    void loadCompaniesForChooser();
  }, [isAuthenticated, isLoading, isOwnerRole]);

  const handleEnterOwnerPortal = () => {
    setShowAccessChooser(false);
    navigate(getPostLoginPath(effectiveRole));
  };

  const handleEnterCompany = async () => {
    const selected = companies.find((item) => item.id === selectedCompanyId);
    if (!selected?.id) {
      setLoginError('Selecione uma empresa para entrar no contexto do cliente.');
      return;
    }

    setIsChoosingAccess(true);
    setLoginError('');

    try {
      const response = await impersonateCompany(selected.id);
      const nowIso = new Date().toISOString();
      const expiresAt = getImpersonationExpiresAt(response);
      const impersonationPayload = getImpersonationPayload(response);

      startImpersonationSession({
        id: impersonationPayload?.id ?? undefined,
        sessionToken: impersonationPayload?.session_token ?? undefined,
        empresaId: selected.id,
        empresaNome: selected.nome ?? selected.slug ?? selected.id,
        startedAt: nowIso,
        expiresAt: expiresAt || undefined,
      });

      if (tenantBaseDomain) {
        let targetHost = await resolveOrRepairTenantHost({
          tenantId: selected.id,
          tenantBaseDomain,
          slugHint: selected.slug ?? undefined,
        });

        if (!targetHost) {
          const { data: { session: activeSession } } = await supabase.auth.getSession();
          const metadataSlug = String(
            activeSession?.user?.app_metadata?.empresa_slug
            ?? activeSession?.user?.user_metadata?.empresa_slug
            ?? response?.session?.user?.app_metadata?.empresa_slug
            ?? response?.session?.user?.user_metadata?.empresa_slug
            ?? selected.slug
            ?? '',
          ).trim().toLowerCase();

          if (metadataSlug) {
            targetHost = await resolveOrRepairTenantHost({
              tenantId: selected.id,
              tenantBaseDomain,
              slugHint: metadataSlug,
            });

            if (!targetHost) {
              targetHost = `${metadataSlug}.${tenantBaseDomain}`;
            }
          }
        }

        if (!targetHost) {
          throw new Error('Nao foi possivel resolver o dominio da empresa. Atualize a empresa e tente novamente em alguns segundos.');
        }

        const { data: { session: activeSession } } = await supabase.auth.getSession();
        const transferCode = await createSessionTransferCode(activeSession ?? session ?? null, targetHost);
        const transferHash = transferCode ? `session_transfer=${encodeURIComponent(transferCode)}` : null;
        const targetUrl = `${window.location.protocol}//${targetHost}/login${transferHash ? `#${transferHash}` : ''}`;
        if (transferHash) {
          try {
            window.sessionStorage.setItem(
              SESSION_TRANSFER_REDIRECT_STORAGE_KEY,
              JSON.stringify({ at: Date.now() }),
            );
          } catch {
            // noop
          }
        }
        window.location.assign(targetUrl);
        return;
      }

      navigate('/dashboard');
    } catch (err: any) {
      setLoginError(String(err?.message ?? 'Falha ao entrar no contexto da empresa.'));
    } finally {
      setIsChoosingAccess(false);
    }
  };

  useEffect(() => {
    // Wait until auth context fully hydrates user/profile before enforcing owner-only logout.
    if (isLoading || !isAuthenticated || !session || !user) return;
    if (isOwnerRole) return;

    setLoginError('Sessão ativa sem permissão de Owner. Faça login com conta SYSTEM_OWNER.');
    void logout();
  }, [isLoading, isAuthenticated, isOwnerRole, logout, session, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoginLoading(true);

    try {
      const normalizedEmail = loginEmail.trim().toLowerCase();
      const validation = loginSchema.safeParse({ email: normalizedEmail, password: loginPassword });
      if (!validation.success) {
        setLoginError(validation.error.errors[0].message);
        setIsLoginLoading(false);
        return;
      }

      const { error } = await login(normalizedEmail, loginPassword);
      if (error) setLoginError(error);
    } catch {
      setLoginError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-emerald-500 mb-4">
            <Shield className="h-8 w-8 text-slate-900" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Owner Portal</h1>
          <p className="text-slate-400 mt-1">Acesso restrito ao time de sistema</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="owner-login-email" className="text-slate-200">Email</Label>
              <Input
                id="owner-login-email"
                type="email"
                placeholder="owner@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="h-11"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-login-password" className="text-slate-200">Senha</Label>
              <Input
                id="owner-login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="h-11"
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {logoutNotice && (
              <div className="rounded-md border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-100">
                {logoutNotice}
              </div>
            )}

            <Button type="submit" className="w-full h-11 font-medium bg-emerald-500 text-slate-900" disabled={isLoginLoading}>
              {isLoginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>

        {showAccessChooser && isAuthenticated && isOwnerRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
              <h2 className="text-lg font-semibold text-slate-100">Escolha o contexto de acesso</h2>
              <p className="mt-1 text-sm text-slate-400">
                Entre no Owner Portal ou selecione uma empresa para acessar o sistema no contexto do cliente.
              </p>

              <div className="mt-4 space-y-2">
                <Label htmlFor="owner-company-picker" className="text-slate-200">Empresa</Label>
                <select
                  id="owner-company-picker"
                  className="h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  disabled={isChooserLoading || isChoosingAccess || companies.length === 0}
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.nome || company.slug || company.id}
                    </option>
                  ))}
                </select>
                {isChooserLoading && <p className="text-xs text-slate-400">Carregando empresas...</p>}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleEnterOwnerPortal}
                  disabled={isChoosingAccess}
                  className="bg-slate-200 text-slate-900 hover:bg-slate-300"
                >
                  Entrar no Owner Portal
                </Button>
                <Button
                  type="button"
                  onClick={handleEnterCompany}
                  disabled={isChoosingAccess || !selectedCompanyId}
                  className="bg-emerald-500 text-slate-900 hover:bg-emerald-400"
                >
                  {isChoosingAccess ? 'Entrando...' : 'Entrar na empresa selecionada'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
