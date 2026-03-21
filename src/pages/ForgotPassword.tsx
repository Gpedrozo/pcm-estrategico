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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card/95 p-6 shadow-industrial">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Recuperar senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe seu email para receber o link de recuperação.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success">
              <MailCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Se o email existir, você receberá um link seguro para redefinir a senha.</span>
            </div>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11"
                autoComplete="email"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
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
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Voltar ao login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
