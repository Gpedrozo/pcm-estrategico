import { useState } from 'react';
import { usePortalMecanico } from '@/contexts/PortalMecanicoContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Wrench } from 'lucide-react';

export default function PortalMecanicoLogin() {
  const { login, isLoggingIn } = usePortalMecanico();
  const { branding } = useBranding();
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');

  const handleSubmit = () => login(codigo, senha);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          {branding?.logo_menu_url ? (
            <img
              src={branding.logo_menu_url}
              alt={branding.nome_fantasia || 'Logo'}
              className="w-20 h-20 rounded-2xl mx-auto object-contain bg-white/10 p-2"
            />
          ) : (
            <div className="mx-auto w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center shadow-2xl">
              <Wrench className="h-10 w-10 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Portal do Mecânico
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {branding?.nome_fantasia || 'PCM Estratégico'}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Input
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="CÓDIGO (ex: MEC-001)"
            autoFocus
            autoComplete="off"
            className="h-16 text-xl font-mono text-center tracking-widest rounded-2xl border-2 border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
          />
          <Input
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="SENHA"
            autoComplete="current-password"
            className="h-16 text-xl text-center tracking-widest rounded-2xl border-2 border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
          />
        </div>

        <Button
          disabled={isLoggingIn}
          className="w-full h-20 text-xl font-black gap-3 rounded-2xl active:scale-95 transition-transform shadow-xl bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
          onClick={handleSubmit}
        >
          {isLoggingIn ? (
            <>
              <div className="animate-spin h-7 w-7 border-3 border-white/30 border-t-white rounded-full" />
              AUTENTICANDO...
            </>
          ) : (
            <>
              <Lock className="h-7 w-7" />
              ENTRAR
            </>
          )}
        </Button>

        <p className="text-center text-xs text-slate-500">
          Acesso exclusivo para mecânicos cadastrados
        </p>
      </div>
    </div>
  );
}
