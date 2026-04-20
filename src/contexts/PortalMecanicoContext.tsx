import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useMecanicoValidarCredenciais, useMecanicoLogin, useMecanicoLogout } from '@/hooks/useMecanicoSessionTracking';
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import { useToast } from '@/hooks/use-toast';
import { useOptionalTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

const MAX_CODIGO_LENGTH = 20;
const MAX_SENHA_LENGTH = 128;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;

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
  const tenantCtx = useOptionalTenant();
  const tenantId = tenantCtx?.tenant?.id ?? null;
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

  const loginAttemptsRef = useRef(0);
  const lockoutUntilRef = useRef(0);

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
        } catch { /* ignore */ }
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
    const pass = senha.trim();
    if (!code || !pass) {
      toast({ title: 'Dados obrigatórios', description: 'Informe código e senha.', variant: 'destructive' });
      return;
    }

    if (code.length > MAX_CODIGO_LENGTH || pass.length > MAX_SENHA_LENGTH) {
      toast({ title: 'Dados inválidos', description: 'Código ou senha excede o tamanho máximo permitido.', variant: 'destructive' });
      return;
    }

    if (Date.now() < lockoutUntilRef.current) {
      const remainingSec = Math.ceil((lockoutUntilRef.current - Date.now()) / 1000);
      toast({ title: 'Aguarde', description: `Muitas tentativas. Tente novamente em ${remainingSec}s.`, variant: 'destructive' });
      return;
    }

    setIsLoggingIn(true);

    // Resolve empresa_id: primeiro tenta pelo tenant (subdomínio), senão busca via RPC
    const resolveEmpresaId = async (): Promise<string | null> => {
      if (tenantId) return tenantId;

      // Fallback: buscar empresa_id via RPC (SECURITY DEFINER, funciona com anon)
      const { data, error } = await supabase.rpc('resolver_empresa_mecanico', {
        p_codigo_acesso: code,
      });

      if (error || !data) return null;
      return data as string;
    };

    resolveEmpresaId().then((empresaId) => {
      if (!empresaId) {
        toast({ title: 'Erro', description: 'Empresa não identificada. Verifique o código de acesso.', variant: 'destructive' });
        setIsLoggingIn(false);
        return;
      }

      // Portal web: não envia dispositivo_id (não tem dispositivo vinculado)

      validarCredenciais.mutate(
        {
          empresa_id: empresaId,
          codigo_acesso: code,
          senha_acesso: pass,
        },
        {
          onSuccess: (result) => {
            if (!result.ok) {
              loginAttemptsRef.current += 1;
              if (loginAttemptsRef.current >= MAX_LOGIN_ATTEMPTS) {
                lockoutUntilRef.current = Date.now() + LOCKOUT_DURATION_MS;
                loginAttemptsRef.current = 0;
              }
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

            loginAttemptsRef.current = 0;
            lockoutUntilRef.current = 0;

            const id = result.mecanico_id || '';

            registrarLogin.mutate(
              {
                empresa_id: empresaId,
                mecanico_id: id,
                codigo_acesso: code,
              },
              {
                onSuccess: (loginResult) => {
                  try {
                    sessionStorage.setItem('portal_mecanico_id', id);
                    sessionStorage.setItem('portal_mecanico_nome', result.mecanico_nome || '');
                    sessionStorage.setItem('portal_mecanico_session_id', loginResult.session_id);
                    sessionStorage.setItem('portal_mecanico_empresa_id', empresaId);
                  } catch { /* ignore */ }
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
    }).catch(() => {
      toast({ title: 'Erro', description: 'Falha ao identificar empresa.', variant: 'destructive' });
      setIsLoggingIn(false);
    });
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
      sessionStorage.removeItem('portal_mecanico_empresa_id');
    } catch { /* ignore */ }
  }, [sessionId, registrarLogout]);

  return (
    <PortalMecanicoContext.Provider value={{ mecanico, sessionId, isLoggingIn, login, logout }}>
      {children}
    </PortalMecanicoContext.Provider>
  );
}
