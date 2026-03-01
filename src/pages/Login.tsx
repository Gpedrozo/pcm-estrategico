import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useTenant } from '@/contexts/TenantContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, Settings } from 'lucide-react';

import { z } from 'zod';

// Validação do login
const loginSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(100, 'Senha muito longa'),
});

const getContrastTextColor = (backgroundColor?: string) => {
  if (!backgroundColor) return '#ffffff';

  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) return '#ffffff';

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.6 ? '#111827' : '#ffffff';
};

export default function Login() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const { login, isAuthenticated, isLoading } = useAuth();
  const { branding } = useBranding();
  const { tenantError, isTenantLoading } = useTenant();
  const navigate = useNavigate();

  // Redireciona se já autenticado
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoginLoading(true);

    try {
      const validation = loginSchema.safeParse({
        email: loginEmail,
        password: loginPassword,
      });

      if (!validation.success) {
        setLoginError(validation.error.errors[0].message);
        setIsLoginLoading(false);
        return;
      }

      const { error } = await login(loginEmail, loginPassword);

      if (error) {
        setLoginError(error);
      }
    } catch {
      setLoginError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  if (isLoading || isTenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const primaryColor = branding?.cor_primaria || '#2563eb';
  const contrastColor = getContrastTextColor(primaryColor);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={branding?.nome_sistema || 'Sistema'}
                className="w-full h-full object-cover"
              />
            ) : (
              <Settings
                className="h-8 w-8"
                style={{ color: contrastColor }}
              />
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            {branding?.nome_sistema || 'PCM ESTRATÉGICO'}
          </h1>

          <p className="text-muted-foreground mt-1">
            Sistema de Gestão de Manutenção Industrial
          </p>
        </div>

        {/* Form */}
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
                autoComplete="email"
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
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {tenantError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{tenantError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-medium"
              disabled={isLoginLoading || !!tenantError}
              style={{
                backgroundColor: primaryColor,
                color: contrastColor,
              }}
            >
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

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 PCM ESTRATÉGICO • v2.0
        </p>
      </div>
    </div>
  );
}