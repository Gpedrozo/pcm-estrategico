import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getPostLoginPath, isOwnerDomain } from '@/lib/security';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, Settings } from 'lucide-react';
import { z } from 'zod';

// Validação do login
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(5, 'Email inválido')
    .max(255, 'Email muito longo')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha muito longa'),
});

const getContrastTextColor = (backgroundColor: string) => {
  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
};

export default function Login() {
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectStep, setRedirectStep] = useState(0);
  const [redirectTimeoutMs, setRedirectTimeoutMs] = useState<number | null>(null);

  const redirectSteps = [
    'Autenticando identidade...',
    'Validando contexto da empresa...',
    'Abrindo ambiente seguro...',
  ];

  const { login, isAuthenticated, isLoading, effectiveRole } = useAuth();
  const navigate = useNavigate();
  const { branding } = useBranding();
  const tenantBaseDomain = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase();
  const currentHost = window.location.hostname.toLowerCase();
  const isTenantBaseHost =
    currentHost === tenantBaseDomain ||
    currentHost === `www.${tenantBaseDomain}`;
  const isGlobalRole =
    effectiveRole === 'SYSTEM_OWNER' ||
    effectiveRole === 'SYSTEM_ADMIN' ||
    effectiveRole === 'MASTER_TI';

  const activeBranding = branding || {
    nome_fantasia: 'PCM ESTRATÉGICO',
    razao_social: 'PCM ESTRATÉGICO',
    logo_login_url: null,
    logo_menu_url: null,
  };

  // Redireciona para dashboard se já estiver logado
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (isTenantBaseHost && !isOwnerDomain(currentHost) && !isGlobalRole) {
        setIsRedirecting(true);
        setRedirectStep(0);
        setRedirectTimeoutMs(Date.now() + 15000);
        return;
      }

      setIsRedirecting(false);
      setRedirectTimeoutMs(null);
      navigate(getPostLoginPath(effectiveRole));
    }
  }, [isAuthenticated, isLoading, navigate, effectiveRole, isTenantBaseHost, currentHost, isGlobalRole]);

  useEffect(() => {
    if (!isRedirecting) {
      setRedirectStep(0);
      return;
    }

    const timer = window.setInterval(() => {
      setRedirectStep((prev) => (prev + 1) % redirectSteps.length);
    }, 900);

    return () => window.clearInterval(timer);
  }, [isRedirecting]);

  useEffect(() => {
    if (!isRedirecting || !redirectTimeoutMs) return;

    const timer = window.setInterval(() => {
      if (Date.now() < redirectTimeoutMs) return;
      setIsRedirecting(false);
      setRedirectTimeoutMs(null);
      setLoginError('Redirecionamento demorou mais que o esperado. Tente novamente em alguns segundos.');
      window.clearInterval(timer);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRedirecting, redirectTimeoutMs]);

  // Função de login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsRedirecting(false);
    setRedirectStep(0);
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

      if (error) {
        setLoginError(error);
        setIsRedirecting(false);
        setRedirectStep(0);
        setRedirectTimeoutMs(null);
      }
    } catch (err) {
      setLoginError('Erro ao fazer login. Tente novamente.');
      setIsRedirecting(false);
      setRedirectStep(0);
      setRedirectTimeoutMs(null);
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Loading inicial
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo e Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 overflow-hidden"
            style={{ backgroundColor: '#111827' }}
          >
            {activeBranding.logo_login_url ? (
              <img src={activeBranding.logo_login_url} alt={activeBranding.nome_fantasia || 'Logo'} className="w-full h-full object-cover" />
            ) : (
              <Settings className="h-8 w-8 text-primary-foreground" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {activeBranding.nome_fantasia || activeBranding.razao_social || 'PCM ESTRATÉGICO'}
          </h1>
          <p className="text-muted-foreground mt-1">Sistema de Gestão de Manutenção Industrial</p>
        </div>

        {/* Login Form */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-industrial">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="h-11"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="h-11"
                autoComplete="off"
              />
            </div>

            {loginError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 font-medium"
              disabled={isLoginLoading || isRedirecting}
              style={{ backgroundColor: '#111827', color: getContrastTextColor('#111827') }}
            >
              {isLoginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecionando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            {isRedirecting && (
              <div className="space-y-2 pt-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${((redirectStep + 1) / redirectSteps.length) * 100}%` }}
                  />
                </div>
                <p className="text-center text-xs font-medium text-foreground/90">{redirectSteps[redirectStep]}</p>
                <p className="text-center text-xs text-muted-foreground">Voce sera direcionado automaticamente para o subdominio da sua empresa.</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 PCM ESTRATÉGICO • v2.0
        </p>
      </div>
    </div>
  );
}
