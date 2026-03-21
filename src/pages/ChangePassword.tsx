import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getPostLoginPath } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { isLoading, isHydrating, authStatus, isAuthenticated, forcePasswordChange, effectiveRole, changePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (
    !isLoading
    && !isHydrating
    && authStatus !== 'idle'
    && authStatus !== 'loading'
    && authStatus !== 'hydrating'
    && (authStatus !== 'authenticated' || !isAuthenticated)
  ) {
    return <Navigate to="/login" replace />;
  }

  if (
    !isLoading
    && !isHydrating
    && authStatus === 'authenticated'
    && isAuthenticated
    && !forcePasswordChange
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const normalized = password.trim();
    if (normalized.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (normalized !== confirmPassword.trim()) {
      setError('As senhas não conferem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: changeError } = await changePassword(normalized);
      if (changeError) {
        setError(changeError);
        return;
      }

      navigate(getPostLoginPath(effectiveRole), { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card/95 p-6 shadow-industrial">
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 mb-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Troca obrigatória de senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Para segurança da sua empresa, defina uma nova senha antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-11"
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full h-11" disabled={isSubmitting || isLoading}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando nova senha...
              </>
            ) : (
              'Atualizar senha'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
