import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(5, 'Email inválido')
    .max(255, 'Email muito longo')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'),
});

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const validation = schema.safeParse({ email: normalizedEmail });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: invokeError } = await supabase.functions.invoke('auth-forgot-password', {
        body: {
          email: normalizedEmail,
          redirect_to: redirectTo,
        },
      });

      if (invokeError) {
        setError('Não foi possível iniciar a recuperação agora. Tente novamente em instantes.');
        return;
      }

      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090f1a] bg-gradient-to-b from-[#0b1220] via-[#0a111d] to-[#090f1a] p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900/95 p-6 shadow-industrial">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-100">Recuperar senha</h1>
          <p className="mt-1 text-sm text-slate-400">
            Informe seu email para receber o link de recuperação.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-950/30 p-3 text-sm text-emerald-200">
              <MailCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Se o email existir, você receberá um link seguro para redefinir a senha.</span>
            </div>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-slate-100">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-slate-200">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
                autoComplete="email"
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
                  Enviando link...
                </>
              ) : (
                'Enviar link de recuperação'
              )}
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-slate-400 hover:text-slate-200">Voltar ao login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
