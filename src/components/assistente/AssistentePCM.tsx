import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  HelpCircle, X, MessageSquare, BookOpen, ChevronRight,
  Send, Loader2, Bot, User, Sparkles, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  resolveManualSlugForRoute,
  getChaptersForRole,
  manualChapters,
  roleLabelMap,
  roleScopeDescription,
} from '@/lib/manualRoleConfig';
import { supabase } from '@/integrations/supabase/client';

type Tab = 'help' | 'chat';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  relatedChapter?: string;
}

export function AssistentePCM() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('help');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const location = useLocation();
  const { effectiveRole, tenantId } = useAuth();

  const currentSlug = resolveManualSlugForRoute(location.pathname);
  const currentChapter = currentSlug
    ? manualChapters.find((ch) => ch.slug === currentSlug)
    : null;

  const visibleChapters = getChaptersForRole(effectiveRole);
  const roleLabel = effectiveRole ? roleLabelMap[effectiveRole] || effectiveRole : 'Usuário';
  const roleScope = effectiveRole ? roleScopeDescription[effectiveRole] || '' : '';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, activeTab]);

  const MAX_PERGUNTA_LENGTH = 500;

  const sanitizePromptInput = (s: string) => s.replace(/[<>{}[\]\\]/g, '').slice(0, MAX_PERGUNTA_LENGTH);

  const handleSendMessage = useCallback(async () => {
    const text = sanitizePromptInput(chatInput.trim());
    if (!text || isTyping) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('assistente-pcm', {
        body: {
          pergunta: text,
          empresa_id: tenantId,
          role: effectiveRole,
          contexto_tela: currentSlug || undefined,
        },
      });

      if (error) {
        // supabase.functions.invoke wraps non-2xx; real message may be in data
        const realMsg = data?.error || data?.message || error.message || '';
        throw new Error(realMsg);
      }

      // Edge function can return error in body even with 200
      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data?.resposta || 'Desculpe, não consegui processar sua pergunta. Tente reformular.',
        timestamp: new Date(),
        relatedChapter: data?.capitulo_relacionado || undefined,
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '';
      const isNotDeployed = errorMsg.includes('FunctionNotFound') || errorMsg.includes('404') || errorMsg.includes('not found');
      const userMessage2 = isNotDeployed
        ? 'A função do assistente IA ainda não foi deployada no Supabase. Execute: supabase functions deploy assistente-pcm'
        : `Erro ao consultar o assistente: ${errorMsg || 'verifique sua conexão e tente novamente.'}`;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: userMessage2,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [chatInput, isTyping, tenantId, effectiveRole, currentSlug]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    'Como faço para fechar uma O.S corretiva?',
    'Qual a diferença entre preventiva e preditiva?',
    'Como criar um plano preventivo?',
    'Como acompanhar minha solicitação?',
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 print:hidden"
        aria-label="Abrir assistente PCM"
      >
        <HelpCircle className="h-5 w-5" />
        <span className="text-sm font-medium hidden sm:inline">Ajuda</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] max-h-[70vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col print:hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-primary/5 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Assistente PCM</h3>
            <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar assistente"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('help')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'help'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Ajuda desta tela
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'chat'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Pergunte ao PCM
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'help' ? (
          <HelpTab
            currentChapter={currentChapter}
            visibleChapters={visibleChapters}
            roleLabel={roleLabel}
            roleScope={roleScope}
            pathname={location.pathname}
          />
        ) : (
          <ChatTab
            chatMessages={chatMessages}
            isTyping={isTyping}
            chatInput={chatInput}
            setChatInput={setChatInput}
            handleSendMessage={handleSendMessage}
            handleKeyDown={handleKeyDown}
            quickQuestions={quickQuestions}
            chatEndRef={chatEndRef}
            inputRef={inputRef}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Help Tab ─── */

function HelpTab({
  currentChapter,
  visibleChapters,
  roleLabel,
  roleScope,
  pathname: _pathname,
}: {
  currentChapter: ReturnType<typeof manualChapters.find>;
  visibleChapters: typeof manualChapters;
  roleLabel: string;
  roleScope: string;
  pathname: string;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Contexto da tela atual */}
      {currentChapter ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary-foreground">{currentChapter.num}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{currentChapter.title}</p>
              <p className="text-[10px] text-muted-foreground">{currentChapter.desc}</p>
            </div>
          </div>
          <Link
            to={`/manual/${currentChapter.slug}`}
            className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            Ver capítulo completo
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            Navegue até um módulo do sistema para ver a ajuda específica dessa tela.
          </p>
        </div>
      )}

      {/* Badge do perfil */}
      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Seu perfil</p>
        <p className="text-sm font-bold text-foreground">{roleLabel}</p>
        {roleScope && <p className="text-[10px] text-muted-foreground">{roleScope}</p>}
        <p className="text-[10px] text-muted-foreground">
          {visibleChapters.length} de {manualChapters.length} capítulos disponíveis
        </p>
      </div>

      {/* Capítulos disponíveis */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Seus capítulos do manual</p>
        <div className="space-y-1 max-h-[200px] overflow-auto">
          {visibleChapters.map((ch) => (
            <Link
              key={ch.slug}
              to={`/manual/${ch.slug}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/60 transition-colors group"
            >
              <span className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {ch.num}
              </span>
              <span className="text-foreground group-hover:text-primary transition-colors">{ch.title}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Chat Tab ─── */

function ChatTab({
  chatMessages,
  isTyping,
  chatInput,
  setChatInput,
  handleSendMessage,
  handleKeyDown,
  quickQuestions,
  chatEndRef,
  inputRef,
}: {
  chatMessages: ChatMessage[];
  isTyping: boolean;
  chatInput: string;
  setChatInput: (v: string) => void;
  handleSendMessage: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  quickQuestions: string[];
  chatEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {chatMessages.length === 0 && (
          <div className="space-y-3">
            <div className="text-center py-4">
              <Bot className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Pergunte ao PCM</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Tire suas dúvidas sobre o sistema em linguagem natural
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                Perguntas rápidas
              </p>
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setChatInput(q);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-foreground'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.relatedChapter && (
                <Link
                  to={`/manual/${msg.relatedChapter}`}
                  className={`flex items-center gap-1 mt-2 text-[10px] font-medium ${
                    msg.role === 'user' ? 'text-primary-foreground/80' : 'text-primary'
                  } hover:underline`}
                >
                  <BookOpen className="h-3 w-3" />
                  Ver capítulo relacionado
                </Link>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2 items-start">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted/60 rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua dúvida..."
            maxLength={500}
            className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isTyping}
            className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Enviar pergunta"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground mt-1.5 text-center">
          IA baseada no conteúdo do manual do sistema
        </p>
      </div>
    </div>
  );
}
