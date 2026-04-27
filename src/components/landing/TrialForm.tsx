import { useState } from 'react';
import { CheckCircle, Copy, ExternalLink, Eye, EyeOff, Loader2, Lock, Mail, Building2, User, ArrowRight, Shield, Calendar, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TrialResult {
  empresa: { id: string; nome: string; slug: string };
  user: { email: string; nome: string };
  subscription: { status: string; starts_at: string; ends_at: string };
  login_url: string;
  trial_ends_at: string;
}

interface CredentialCardProps {
  result: TrialResult;
}

function CredentialCard({ result }: CredentialCardProps) {
  const [copied, setCopied] = useState(false);

  const trialDate = new Date(result.trial_ends_at + 'T00:00:00');
  const formatted = trialDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const noteText = `✅ CONTA PCM ESTRATÉGICO CRIADA COM SUCESSO!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 Empresa:    ${result.empresa.nome}
🔗 Slug:       ${result.empresa.slug}
🌐 URL acesso: ${result.login_url}
👤 Login:      ${result.user.email}
📅 Trial até:  ${formatted}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Acesse agora: ${result.login_url}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(noteText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 shadow-2xl shadow-emerald-500/10">
      {/* Glow de fundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">Sua conta foi criada!</h3>
            <p className="text-emerald-400/80 text-sm mt-0.5">Trial de 30 dias com acesso completo ao sistema</p>
          </div>
        </div>

        {/* Dados */}
        <div className="space-y-3 mb-6">
          {[
            { icon: Building2, label: 'Empresa', value: result.empresa.nome, color: 'text-blue-400' },
            { icon: Globe, label: 'URL do sistema', value: result.login_url, color: 'text-cyan-400', isLink: true },
            { icon: Mail, label: 'Login (e-mail)', value: result.user.email, color: 'text-slate-300' },
            { icon: Calendar, label: 'Trial válido até', value: formatted, color: 'text-amber-400' },
          ].map(({ icon: Icon, label, value, color, isLink }) => (
            <div key={label} className="flex items-start gap-3 bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700/40">
              <Icon className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">{label}</div>
                {isLink ? (
                  <a href={value} target="_blank" rel="noopener noreferrer" className={`text-sm ${color} font-medium hover:underline truncate block`}>
                    {value}
                  </a>
                ) : (
                  <div className={`text-sm ${color} font-medium truncate`}>{value}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Aviso senha */}
        <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 mb-5">
          <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-300/80 text-xs leading-relaxed">
            Use a senha que você acabou de criar. Guarde esse link de acesso — ele é exclusivo da sua empresa.
          </p>
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={result.login_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold rounded-xl px-4 py-3 transition-all duration-200 text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Acessar meu sistema agora
          </a>
          <button
            onClick={handleCopy}
            className={`flex items-center justify-center gap-2 border rounded-xl px-4 py-3 transition-all duration-200 text-sm font-medium ${
              copied
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white'
            }`}
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copiado!' : 'Copiar dados'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Formulário principal ─────────────────────────────────────────────────────
interface TrialFormProps {
  onSuccess?: () => void;
}

export function TrialForm({ onSuccess }: TrialFormProps) {
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TrialResult | null>(null);

  const passwordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strengthColor = ['bg-slate-700', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];
  const strengthLabel = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  const strength = passwordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!terms) { setError('Aceite os termos de uso para continuar.'); return; }
    if (password.length < 8) { setError('Senha deve ter no mínimo 8 caracteres.'); return; }
    if (!/[A-Z]/.test(password)) { setError('Senha deve ter pelo menos 1 letra maiúscula.'); return; }
    if (!/[0-9]/.test(password)) { setError('Senha deve ter pelo menos 1 número.'); return; }

    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('trial-register', {
        body: {
          company_name: companyName.trim(),
          user_name: userName.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
      });

      if (fnError) {
        let msg = fnError.message ?? 'Erro ao criar conta.';
        try {
          const ctx = (fnError as any)?.context;
          if (ctx?.text) msg = await ctx.text();
          const parsed = JSON.parse(msg);
          if (parsed?.error) msg = parsed.error;
        } catch {
          // JSON parsing failed — use raw message
        }
        setError(msg);
        return;
      }

      if (!data?.success) {
        setError(data?.error ?? 'Erro desconhecido ao criar conta.');
        return;
      }

      setResult(data as TrialResult);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message ?? 'Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (result) return <CredentialCard result={result} />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Empresa */}
      <div className="relative">
        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Nome da empresa *"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          required
          minLength={2}
          className="w-full bg-slate-800/60 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 pl-10 text-white placeholder-slate-500 text-sm outline-none transition-all"
        />
      </div>

      {/* Nome */}
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Seu nome *"
          value={userName}
          onChange={e => setUserName(e.target.value)}
          required
          minLength={2}
          className="w-full bg-slate-800/60 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 pl-10 text-white placeholder-slate-500 text-sm outline-none transition-all"
        />
      </div>

      {/* Email */}
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="email"
          placeholder="Seu e-mail *"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full bg-slate-800/60 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 pl-10 text-white placeholder-slate-500 text-sm outline-none transition-all"
        />
      </div>

      {/* Senha */}
      <div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="Criar senha *"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full bg-slate-800/60 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 pl-10 pr-10 text-white placeholder-slate-500 text-sm outline-none transition-all"
          />
          <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {/* Barra de força */}
        {password && (
          <div className="mt-2 flex gap-1 items-center">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor[strength] : 'bg-slate-700'}`} />
            ))}
            <span className={`text-[11px] ml-1 ${strength >= 3 ? 'text-emerald-400' : strength >= 2 ? 'text-amber-400' : 'text-red-400'}`}>
              {strengthLabel[strength]}
            </span>
          </div>
        )}
      </div>

      {/* Termos */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5">
          <input
            type="checkbox"
            checked={terms}
            onChange={e => setTerms(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${terms ? 'bg-blue-500 border-blue-500' : 'border-slate-600 group-hover:border-blue-500/50'}`}>
            {terms && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </div>
        </div>
        <span className="text-slate-400 text-xs leading-relaxed">
          Concordo com os{' '}
          <a href="#" className="text-blue-400 hover:underline">Termos de Uso</a>
          {' '}e a{' '}
          <a href="#" className="text-blue-400 hover:underline">Política de Privacidade</a>
          . Sem cartão de crédito. Cancel quando quiser.
        </span>
      </label>

      {/* Erro */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !companyName || !userName || !email || !password || !terms}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl px-6 py-4 transition-all duration-200 text-sm shadow-lg shadow-blue-500/20"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Criando sua conta...
          </>
        ) : (
          <>
            Criar minha conta grátis
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Trust badges */}
      <div className="flex flex-wrap gap-3 justify-center pt-1">
        {['✓ Sem cartão', '✓ 30 dias grátis', '✓ Cancele quando quiser', '✓ Dados reais'].map(b => (
          <span key={b} className="text-slate-500 text-[11px]">{b}</span>
        ))}
      </div>
    </form>
  );
}
