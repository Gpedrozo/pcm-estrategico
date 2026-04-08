/**
 * Configuração de capítulos do manual por nível de usuário.
 * Cada role vê apenas os capítulos relevantes para sua função.
 */

import type { AppRole } from '@/contexts/AuthContext';

export interface ManualChapter {
  num: string;
  slug: string;
  title: string;
  desc: string;
  /** Roles que têm acesso a este capítulo. Vazio = todos */
  roles: AppRole[];
}

/** Mapa de rota do sistema → slug do capítulo do manual para help contextual */
export const routeToManualSlug: Record<string, string> = {
  '/dashboard': 'rotina',
  '/solicitacoes': 'solicitacoes',
  '/backlog': 'backlog',
  '/os/nova': 'emitir-os',
  '/os/fechar': 'fechar-os',
  '/os/historico': 'historico',
  '/painel-mecanico': 'fechar-os',
  '/painel-operador': 'solicitacoes',
  '/programacao': 'programacao',
  '/preventiva': 'preventiva',
  '/preditiva': 'preditiva',
  '/lubrificacao': 'lubrificacao',
  '/inspecoes': 'inspecoes',
  '/fmea': 'fmea-rcm',
  '/causa-raiz': 'rca',
  '/inteligencia-causa-raiz': 'inteligencia-ia',
  '/melhorias': 'melhorias',
  '/hierarquia': 'cadastros',
  '/equipamentos': 'cadastros',
  '/mecanicos': 'cadastros',
  '/materiais': 'cadastros',
  '/fornecedores': 'cadastros',
  '/contratos': 'cadastros',
  '/documentos': 'cadastros',
  '/custos': 'custos-relatorios',
  '/relatorios': 'custos-relatorios',
  '/ssma': 'ssma',
  '/admin': 'administracao',
  '/master-ti': 'administracao',
  '/usuarios': 'administracao',
  '/auditoria': 'administracao',
  '/suporte': 'login',
  '/instalar': 'login',
};

/**
 * Resolve a rota atual para o slug do manual mais próximo.
 * Faz match exato primeiro, depois por prefixo.
 */
export function resolveManualSlugForRoute(pathname: string): string | null {
  // Exact match
  if (routeToManualSlug[pathname]) return routeToManualSlug[pathname];

  // Prefix match (para sub-rotas como /os/fechar/123)
  const sorted = Object.keys(routeToManualSlug).sort((a, b) => b.length - a.length);
  for (const route of sorted) {
    if (pathname.startsWith(route)) return routeToManualSlug[route];
  }

  return null;
}

const ALL_ROLES: AppRole[] = [];

/** Definição completa dos 22 capítulos com restrição por role */
export const manualChapters: ManualChapter[] = [
  { num: '01', slug: 'login', title: 'Login e Primeiro Acesso', desc: 'Autenticação, recuperação de senha e primeiro login', roles: ALL_ROLES },
  { num: '02', slug: 'perfis', title: 'Perfis e Permissões', desc: 'Níveis de acesso: Solicitante, Usuário, Admin, Master TI', roles: ALL_ROLES },
  { num: '03', slug: 'solicitacoes', title: 'Solicitações de Manutenção', desc: 'Abertura, triagem e acompanhamento de solicitações', roles: ALL_ROLES },
  { num: '04', slug: 'backlog', title: 'Backlog de Manutenção', desc: 'Gestão de demandas pendentes e priorização', roles: ['USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN', 'OPERADOR'] },
  { num: '05', slug: 'emitir-os', title: 'Emitir Ordem de Serviço', desc: 'Criação e detalhamento de O.S', roles: ['USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN', 'TECHNICIAN', 'MECANICO', 'OPERADOR'] },
  { num: '06', slug: 'fechar-os', title: 'Fechar Ordem de Serviço', desc: 'Encerramento, materiais e validação técnica', roles: ['USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN', 'TECHNICIAN', 'MECANICO', 'OPERADOR'] },
  { num: '07', slug: 'historico', title: 'Histórico de O.S', desc: 'Consulta avançada e análise de histórico', roles: ['USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN', 'TECHNICIAN', 'OPERADOR'] },
  { num: '08', slug: 'programacao', title: 'Programação de Manutenção', desc: 'Calendário, alocação e capacidade', roles: ['USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN', 'OPERADOR'] },
  { num: '09', slug: 'preventiva', title: 'Manutenção Preventiva', desc: 'Planos, periodicidade e aderência', roles: ['USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN', 'OPERADOR'] },
  { num: '10', slug: 'preditiva', title: 'Manutenção Preditiva', desc: 'Medições, tendências e alertas preditivos', roles: ['USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN', 'OPERADOR'] },
  { num: '11', slug: 'lubrificacao', title: 'Lubrificação', desc: 'Planos de lubrificação e controle', roles: ['USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN', 'OPERADOR'] },
  { num: '12', slug: 'inspecoes', title: 'Inspeções', desc: 'Rotinas de inspeção e anomalias', roles: ['USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN', 'OPERADOR'] },
  { num: '13', slug: 'fmea-rcm', title: 'FMEA / RCM', desc: 'Análise de modos de falha e confiabilidade', roles: ['ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN'] },
  { num: '14', slug: 'rca', title: 'RCA — Análise de Causa Raiz', desc: 'Investigação de causa raiz e ações corretivas', roles: ['ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN'] },
  { num: '15', slug: 'inteligencia-ia', title: 'Inteligência Artificial', desc: 'Diagnóstico assistido por IA', roles: ['ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN'] },
  { num: '16', slug: 'melhorias', title: 'Melhorias', desc: 'Gestão de melhorias de confiabilidade', roles: ['ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN'] },
  { num: '17', slug: 'cadastros', title: 'Cadastros Estruturais', desc: 'Hierarquia, equipamentos, materiais, fornecedores', roles: ['USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN', 'OPERADOR'] },
  { num: '18', slug: 'custos-relatorios', title: 'Custos e Relatórios', desc: 'Visão financeira e relatórios gerenciais', roles: ['ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN'] },
  { num: '19', slug: 'ssma', title: 'SSMA', desc: 'Segurança, saúde e meio ambiente', roles: ['ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN'] },
  { num: '20', slug: 'administracao', title: 'Administração e Governança', desc: 'Usuários, auditoria e configuração', roles: ['ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN'] },
  { num: '21', slug: 'rotina', title: 'Rotina Operacional', desc: 'Ciclo diário, semanal e mensal', roles: ALL_ROLES },
  { num: '22', slug: 'kpis', title: 'KPIs e Métricas', desc: 'MTBF, MTTR, disponibilidade e mais', roles: ['USUARIO', 'ADMIN', 'MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN', 'OPERADOR'] },
];

/** Filtra capítulos visíveis para o role do usuário */
export function getChaptersForRole(role: AppRole | undefined): ManualChapter[] {
  if (!role) return manualChapters;

  return manualChapters.filter((ch) => {
    // roles vazio = visível para todos
    if (ch.roles.length === 0) return true;
    return ch.roles.includes(role);
  });
}

/** Labels amigáveis por role */
export const roleLabelMap: Record<string, string> = {
  SOLICITANTE: 'Solicitante',
  TECHNICIAN: 'Mecânico / Técnico',
  MECANICO: 'Mecânico / Técnico',
  USUARIO: 'Operador / Planejador',
  OPERADOR: 'Operador / Planejador',
  ADMIN: 'Administrador',
  MASTER_TI: 'Master TI',
  SYSTEM_ADMIN: 'Administrador do Sistema',
  SYSTEM_OWNER: 'Owner da Plataforma',
};

/** Descrição breve do que o role pode fazer */
export const roleScopeDescription: Record<string, string> = {
  SOLICITANTE: 'Abertura e acompanhamento de solicitações',
  TECHNICIAN: 'Execução e fechamento de ordens de serviço em campo',
  MECANICO: 'Execução e fechamento de ordens de serviço em campo',
  USUARIO: 'Operação completa de manutenção e planejamento',
  OPERADOR: 'Operação completa de manutenção e planejamento',
  ADMIN: 'Gestão completa do tenant, incluindo análises e administração',
  MASTER_TI: 'Configuração técnica avançada e monitoramento do sistema',
  SYSTEM_ADMIN: 'Administração global da plataforma',
  SYSTEM_OWNER: 'Acesso total à plataforma e todos os tenants',
};
