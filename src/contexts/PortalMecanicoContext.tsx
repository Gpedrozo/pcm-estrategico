import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useMecanicoValidarCredenciais, useMecanicoLogin, useMecanicoLogout } from '@/hooks/useMecanicoSessionTracking';
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface MecanicoLogado {
  id: string;
  nome: string;
  codigo_acesso: string | null;
  especialidade: string | null;
}

interface PortalMecanicoContextType {
  mecanico: MecanicoLogado | null;
  sessionId: string | null;
  isLoggingIn: boolean;
  login: (codigo: string, senha: string) => void;
  logout: () => void;
}

const PortalMecanicoContext = createContext<PortalMecanicoContextType | null>(null);

export function usePortalMecanico() {
  const ctx = useContext(PortalMecanicoContext);
  if (!ctx) throw new Error('usePortalMecanico must be used within PortalMecanicoProvider');
  return ctx;
}

export function PortalMecanicoProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { tenantId } = useAuth();
  const { data: mecanicos } = useMecanicosAtivos();
  const validarCredenciais = useMecanicoValidarCredenciais();
  const registrarLogin = useMecanicoLogin();
  const registrarLogout = useMecanicoLogout();

  const [mecanicoId, setMecanicoId] = useState<string | null>(() => {
    try { return sessionStorage.getItem('portal_mecanico_id'); } catch { return null; }
  });
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try { return sessionStorage.getItem('portal_mecanico_session_id'); } catch { return null; }
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const sessionIdRef = useRef(sessionId);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // Auto-logout por inatividade (30 min)
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetInactivity = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    if (sessionIdRef.current) {
      inactivityRef.current = setTimeout(() => {
        if (sessionIdRef.current) {
          registrarLogout.mutate({ session_id: sessionIdRef.current, motivo: 'Inatividade (30 min)' });
        }
        setMecanicoId(null);
        setSessionId(null);
        try {
          sessionStorage.removeItem('portal_mecanico_id');
          sessionStorage.removeItem('portal_mecanico_nome');
          sessionStorage.removeItem('portal_mecanico_session_id');
        } catch {}
        toast({ title: 'Sessão expirada', description: 'Faça login novamente.' });
      }, 30 * 60 * 1000);
    }
  }, [registrarLogout, toast]);

  useEffect(() => {
    if (!mecanicoId) return;
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => resetInactivity();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetInactivity();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
    };
  }, [mecanicoId, resetInactivity]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        registrarLogout.mutate({ session_id: sessionIdRef.current, motivo: 'Navegou para fora do portal' });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mecanico: MecanicoLogado | null = mecanicoId
    ? (() => {
        const m = (mecanicos || []).find(m => m.id === mecanicoId);
        if (!m) return null;
        return { id: m.id, nome: m.nome, codigo_acesso: m.codigo_acesso ?? null, especialidade: m.especialidade ?? null };
      })()
    : null;

  const login = useCallback((codigo: string, senha: string) => {
    const code = codigo.trim().toUpperCase();
    if (!code || !senha.trim()) {
      toast({ title: 'Dados obrigatórios', description: 'Informe código e senha.', variant: 'destructive' });
      return;
    }
    if (!tenantId) {
      toast({ title: 'Erro', description: 'Empresa não identificada.', variant: 'destructive' });
      return;
    }

    setIsLoggingIn(true);

    validarCredenciais.mutate(
      {
        empresa_id: tenantId,
        dispositivo_id: `portal-web-${navigator.userAgent.slice(0, 50)}`,
        codigo_acesso: code,
        senha_acesso: senha,
      },
      {
        onSuccess: (result) => {
          if (!result.ok) {
            toast({
              title: `Erro: ${result.resultado}`,
              description: result.motivo || 'Falha na validação',
              variant: 'destructive',
            });
            if (result.tentativas !== undefined && result.tentativas > 0) {
              toast({ title: 'Aviso', description: `${5 - result.tentativas} tentativa(s) restante(s)` });
            }
            setIsLoggingIn(false);
            return;
          }

          const id = result.mecanico_id || '';

          registrarLogin.mutate(
            {
              empresa_id: tenantId,
              dispositivo_id: `portal-web-${navigator.userAgent.slice(0, 50)}`,
              mecanico_id: id,
              device_token: 'portal-mecanico-web',
              codigo_acesso: code,
            },
            {
              onSuccess: (loginResult) => {
                try {
                  sessionStorage.setItem('portal_mecanico_id', id);
                  sessionStorage.setItem('portal_mecanico_nome', result.mecanico_nome || '');
                  sessionStorage.setItem('portal_mecanico_session_id', loginResult.session_id);
                } catch {}
                setMecanicoId(id);
                setSessionId(loginResult.session_id);
                setIsLoggingIn(false);
                toast({ title: 'Login realizado', description: `Bem-vindo, ${result.mecanico_nome}!` });
              },
              onError: (e: Error) => {
                toast({ title: 'Erro ao registrar login', description: e.message, variant: 'destructive' });
                setIsLoggingIn(false);
              },
            },
          );
        },
        onError: (e: Error) => {
          toast({ title: 'Erro na validação', description: e.message, variant: 'destructive' });
          setIsLoggingIn(false);
        },
      },
    );
  }, [tenantId, validarCredenciais, registrarLogin, toast]);

  const logout = useCallback(() => {
    if (sessionId) {
      registrarLogout.mutate({ session_id: sessionId, motivo: 'Logout manual' });
    }
    setMecanicoId(null);
    setSessionId(null);
    try {
      sessionStorage.removeItem('portal_mecanico_id');
      sessionStorage.removeItem('portal_mecanico_nome');
      sessionStorage.removeItem('portal_mecanico_session_id');
    } catch {}
  }, [sessionId, registrarLogout]);

  return (
    <PortalMecanicoContext.Provider value={{ mecanico, sessionId, isLoggingIn, login, logout }}>
      {children}
    </PortalMecanicoContext.Provider>
  );
}
