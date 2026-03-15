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
  const { isLoading, isAuthenticated, forcePasswordChange, effectiveRole, changePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isLoading && isAuthenticated && !forcePasswordChange) {
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
    <div className="min-h-screen flex items-center justify-center bg-[#090f1a] bg-gradient-to-b from-[#0b1220] via-[#0a111d] to-[#090f1a] p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900/95 p-6 shadow-industrial">
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/40 border border-emerald-500/40 mb-3">
            <ShieldCheck className="h-6 w-6 text-emerald-300" />
          </div>
          <h1 className="text-xl font-semibold text-slate-100">Troca obrigatória de senha</h1>
          <p className="mt-1 text-sm text-slate-400">
            Para segurança da sua empresa, defina uma nova senha antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-slate-200">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 border-slate-600 bg-slate-800 text-slate-100"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-slate-200">Confirmar senha</Label>
            <Input
              id="confirm-password"
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
