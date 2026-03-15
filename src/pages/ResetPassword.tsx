import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function getHashParams() {
  const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(raw);
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, changePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isPreparingRecovery, setIsPreparingRecovery] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  const urlErrorMessage = useMemo(() => {
    const hashParams = getHashParams();
    const errorDescription = hashParams.get('error_description');
    if (!errorDescription) return '';
    return decodeURIComponent(errorDescription);
  }, []);

  useEffect(() => {
    let active = true;

    const prepareRecoverySession = async () => {
      try {
        const hashParams = getHashParams();
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');

        if (accessToken && refreshToken && (hashType === 'recovery' || !hashType)) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            if (active) setError('Link de recuperação inválido ou expirado.');
          } else if (active) {
            setRecoveryReady(true);
          }

          hashParams.delete('access_token');
          hashParams.delete('refresh_token');
          hashParams.delete('type');
          hashParams.delete('expires_at');
          hashParams.delete('expires_in');
          hashParams.delete('token_type');
          hashParams.delete('error');
          hashParams.delete('error_code');
          hashParams.delete('error_description');
          const nextHash = hashParams.toString();
          const cleanedUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
          window.history.replaceState({}, document.title, cleanedUrl);
          return;
        }

        const queryParams = new URLSearchParams(window.location.search);
        const authCode = queryParams.get('code');
        if (authCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) {
            if (active) setError('Código de recuperação inválido ou expirado.');
          } else if (active) {
            setRecoveryReady(true);
          }

          queryParams.delete('code');
          const nextQuery = queryParams.toString();
          const cleanedUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
          window.history.replaceState({}, document.title, cleanedUrl);
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token && active) {
          setRecoveryReady(true);
        }
      } finally {
        if (active) setIsPreparingRecovery(false);
      }
    };

    void prepareRecoverySession();

    return () => {
      active = false;
    };
  }, []);

  if (urlErrorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090f1a] p-4">
        <div className="w-full max-w-md rounded-lg border border-rose-500/40 bg-slate-900 p-6">
          <p className="text-sm text-rose-200">{urlErrorMessage}</p>
          <Link to="/forgot-password" className="mt-4 inline-block text-sm text-slate-300 hover:text-slate-100">
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  if (!isPreparingRecovery && !isLoading && !isAuthenticated && !recoveryReady) {
    return <Navigate to="/forgot-password" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const normalizedPassword = password.trim();
    if (normalizedPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (normalizedPassword !== confirmPassword.trim()) {
      setError('As senhas não conferem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: changeError } = await changePassword(normalizedPassword);
      if (changeError) {
        setError(changeError);
        return;
      }

      navigate('/dashboard', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090f1a] bg-gradient-to-b from-[#0b1220] via-[#0a111d] to-[#090f1a] p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900/95 p-6 shadow-industrial">
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/40 border border-emerald-500/40 mb-3">
            <ShieldCheck className="h-6 w-6 text-emerald-300" />
          </div>
          <h1 className="text-xl font-semibold text-slate-100">Redefinir senha</h1>
          <p className="mt-1 text-sm text-slate-400">
            Defina sua nova senha para continuar no sistema.
          </p>
        </div>

        {(isPreparingRecovery || isLoading) ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password" className="text-slate-200">Nova senha</Label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 border-slate-600 bg-slate-800 text-slate-100"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-password-confirm" className="text-slate-200">Confirmar senha</Label>
              <Input
                id="reset-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 border-slate-600 bg-slate-800 text-slate-100"
                autoComplete="new-password"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-rose-500/50 bg-rose-950/40 p-3 text-sm text-rose-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando nova senha...
                </>
              ) : (
                'Salvar nova senha'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
