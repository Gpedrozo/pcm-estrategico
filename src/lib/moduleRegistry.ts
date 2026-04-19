/**
 * Central registry of all system modules that can be toggled per empresa.
 *
 * Each module maps to:
 *  - one or more sidebar items (by their route path)
 *  - one or more routes in App.tsx
 *
 * The Owner Portal uses this registry to render checkboxes for enabling/disabling
 * modules per empresa, and the client sidebar + route guards filter based on it.
 */

export interface SystemModule {
  /** Unique key stored in configuracoes_sistema.modules JSON */
  key: string
  /** Display name (PT-BR) */
  label: string
  /** Short description for Owner UI */
  description: string
  /** Sidebar section this module belongs to */
  section: 'ordens' | 'planejamento' | 'analises' | 'catalogos' | 'relatorios' | 'seguranca'
  /** Routes covered by this module (prefix match) */
  routes: string[]
  /** Sidebar item paths this module controls */
  sidebarPaths: string[]
  /** Whether this module is enabled by default for new empresas */
  defaultEnabled: boolean
}

export const SYSTEM_MODULES: SystemModule[] = [
  // ── Ordens de Serviço ──────────────────────────────────────
  {
    key: 'ordens_servico',
    label: 'Ordens de Serviço',
    description: 'Solicitações, emissão, fechamento e histórico de OS',
    section: 'ordens',
    routes: ['/solicitacoes', '/backlog', '/os/nova', '/os/fechar', '/os/historico'],
    sidebarPaths: ['/solicitacoes', '/backlog', '/os/nova', '/os/fechar', '/os/historico'],
    defaultEnabled: true,
  },
  {
    key: 'portal_mecanico',
    label: 'Portal Mecânico',
    description: 'Portal web e mobile para mecânicos executarem OS',
    section: 'ordens',
    routes: ['/os/portal-mecanico', '/portal-mecanico', '/mecanico'],
    sidebarPaths: ['/os/portal-mecanico'],
    defaultEnabled: true,
  },

  // ── Planejamento ───────────────────────────────────────────
  {
    key: 'lubrificacao',
    label: 'Lubrificação',
    description: 'Rotas, cronograma e estoque de lubrificantes',
    section: 'planejamento',
    routes: ['/lubrificacao'],
    sidebarPaths: ['/lubrificacao'],
    defaultEnabled: true,
  },
  {
    key: 'programacao',
    label: 'Programação',
    description: 'Programação e calendário de manutenção',
    section: 'planejamento',
    routes: ['/programacao'],
    sidebarPaths: ['/programacao'],
    defaultEnabled: true,
  },
  {
    key: 'preventiva',
    label: 'Preventiva',
    description: 'Planos e execução de manutenção preventiva',
    section: 'planejamento',
    routes: ['/preventiva'],
    sidebarPaths: ['/preventiva'],
    defaultEnabled: true,
  },
  {
    key: 'preditiva',
    label: 'Preditiva',
    description: 'Monitoramento e análise preditiva de falhas',
    section: 'planejamento',
    routes: ['/preditiva'],
    sidebarPaths: ['/preditiva'],
    defaultEnabled: false,
  },
  {
    key: 'inspecoes',
    label: 'Inspeções',
    description: 'Checklists e rotinas de inspeção',
    section: 'planejamento',
    routes: ['/inspecoes'],
    sidebarPaths: ['/inspecoes'],
    defaultEnabled: false,
  },

  // ── Análises ───────────────────────────────────────────────
  {
    key: 'fmea_rcm',
    label: 'FMEA / RCM',
    description: 'Análise de modos de falha e Causa Raiz com IA',
    section: 'analises',
    routes: ['/fmea', '/rca', '/inteligencia-causa-raiz'],
    sidebarPaths: ['/fmea', '/rca', '/inteligencia-causa-raiz'],
    defaultEnabled: false,
  },
  {
    key: 'melhorias',
    label: 'Melhorias',
    description: 'Gestão de projetos de melhoria contínua',
    section: 'analises',
    routes: ['/melhorias'],
    sidebarPaths: ['/melhorias'],
    defaultEnabled: false,
  },

  // ── Catálogos ──────────────────────────────────────────────
  {
    key: 'hierarquia',
    label: 'Hierarquia de Ativos',
    description: 'Estrutura hierárquica de plantas, áreas e linhas',
    section: 'catalogos',
    routes: ['/hierarquia'],
    sidebarPaths: ['/hierarquia'],
    defaultEnabled: true,
  },
  {
    key: 'equipamentos',
    label: 'Equipamentos',
    description: 'Cadastro e gestão de equipamentos',
    section: 'catalogos',
    routes: ['/equipamentos'],
    sidebarPaths: ['/equipamentos'],
    defaultEnabled: true,
  },
  {
    key: 'mecanicos',
    label: 'Mecânicos',
    description: 'Cadastro de mecânicos e colaboradores',
    section: 'catalogos',
    routes: ['/mecanicos'],
    sidebarPaths: ['/mecanicos'],
    defaultEnabled: true,
  },
  {
    key: 'materiais',
    label: 'Materiais',
    description: 'Almoxarifado e gestão de materiais',
    section: 'catalogos',
    routes: ['/materiais'],
    sidebarPaths: ['/materiais'],
    defaultEnabled: true,
  },
  {
    key: 'fornecedores',
    label: 'Fornecedores',
    description: 'Cadastro e gestão de fornecedores',
    section: 'catalogos',
    routes: ['/fornecedores'],
    sidebarPaths: ['/fornecedores'],
    defaultEnabled: true,
  },
  {
    key: 'contratos',
    label: 'Contratos',
    description: 'Contratos de fornecedores e prestadores',
    section: 'catalogos',
    routes: ['/contratos'],
    sidebarPaths: ['/contratos'],
    defaultEnabled: false,
  },
  {
    key: 'documentos',
    label: 'Catálogos Técnicos',
    description: 'Manuais técnicos, FISPQs e documentos',
    section: 'catalogos',
    routes: ['/documentos'],
    sidebarPaths: ['/documentos'],
    defaultEnabled: false,
  },

  // ── Relatórios ─────────────────────────────────────────────
  {
    key: 'custos',
    label: 'Custos',
    description: 'Gestão e análise de custos de manutenção',
    section: 'relatorios',
    routes: ['/custos'],
    sidebarPaths: ['/custos'],
    defaultEnabled: false,
  },
  {
    key: 'relatorios',
    label: 'Relatórios',
    description: 'Relatórios gerenciais e indicadores',
    section: 'relatorios',
    routes: ['/relatorios'],
    sidebarPaths: ['/relatorios'],
    defaultEnabled: true,
  },

  // ── Segurança ──────────────────────────────────────────────
  {
    key: 'ssma',
    label: 'SSMA',
    description: 'Segurança, Saúde e Meio Ambiente',
    section: 'seguranca',
    routes: ['/ssma'],
    sidebarPaths: ['/ssma'],
    defaultEnabled: false,
  },
]

/** Map of module key -> SystemModule for O(1) lookup */
export const MODULE_MAP = Object.fromEntries(
  SYSTEM_MODULES.map((m) => [m.key, m]),
) as Record<string, SystemModule>

/** All module keys */
export const MODULE_KEYS = SYSTEM_MODULES.map((m) => m.key)

/** Default modules object for new empresas (all defaultEnabled modules set to true) */
export const DEFAULT_MODULES: Record<string, boolean> = Object.fromEntries(
  SYSTEM_MODULES.map((m) => [m.key, m.defaultEnabled]),
)

/**
 * Given a route path, find the module key that governs it.
 * Returns undefined if the route is not module-gated (e.g. /dashboard, /suporte).
 */
export function getModuleForRoute(routePath: string): string | undefined {
  for (const mod of SYSTEM_MODULES) {
    if (mod.routes.some((r) => routePath === r || routePath.startsWith(r + '/'))) {
      return mod.key
    }
  }
  return undefined
}

/**
 * Given a sidebar path, find the module key that governs it.
 * Returns undefined if the path is not module-gated.
 */
export function getModuleForSidebarPath(sidebarPath: string): string | undefined {
  for (const mod of SYSTEM_MODULES) {
    if (mod.sidebarPaths.some((p) => sidebarPath === p || sidebarPath.startsWith(p + '/'))) {
      return mod.key
    }
  }
  return undefined
}
