// Schema Validation Foundation
// Date: 2026-04-02
// Purpose: Zod schema library for standardized validation across ALL modules
// Usage: import { EquipamentoSchema, OrdensServicoSchema } from '@/schemas'

import { z } from 'zod';

// =====================
// Core UUIDs & Common Fields
// =====================

export const UUIDSchema = z.string().uuid('ID inválido');
export const EmpresaIdSchema = UUIDSchema.describe('Identificador da empresa/tenant');
export const UsuarioIdSchema = UUIDSchema.describe('Identificador do usuário');

// =====================
// EQUIPAMENTOS Schema
// =====================

export const EquipamentoCreateSchema = z.object({
  empresa_id: EmpresaIdSchema,
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(255),
  tipo: z.enum(['maquinaria', 'estrutura', 'utilidade', 'veiculo', 'outro'], {
    errorMap: () => ({ message: 'Tipo de equipamento inválido' }),
  }),
  fabricante: z.string().optional(),
  modelo: z.string().optional(),
  numero_serie: z.string().max(100).optional(),
  localizacao: z.string().max(255).optional(),
  data_aquisicao: z.string().datetime().optional(),
  valor_aquisicao: z.number().nonnegative().optional(),
  status: z.enum(['ativo', 'manutencao', 'parado', 'descartado']).default('ativo'),
});

export const EquipamentoUpdateSchema = EquipamentoCreateSchema.omit({ empresa_id: true }).partial();
export type EquipamentoCreate = z.infer<typeof EquipamentoCreateSchema>;
export type EquipamentoUpdate = z.infer<typeof EquipamentoUpdateSchema>;

// =====================
// ORDENS DE SERVIÇO Schema
// =====================

export const OrdensServicoCreateSchema = z.object({
  empresa_id: EmpresaIdSchema,
  equipamento_id: UUIDSchema.optional(),
  tipo: z.enum(['corretiva', 'preventiva', 'preditiva', 'lubrificacao'], {
    errorMap: () => ({ message: 'Tipo de manutenção inválido' }),
  }),
  prioridade: z.enum(['baixa', 'normal', 'alta', 'urgente']).default('normal'),
  descricao: z.string().min(5, 'Descrição deve ter pelo menos 5 caracteres'),
  data_solicitacao: z.string().datetime().optional(),
  dataAlvo: z.string().datetime('Data alvo inválida'),
  custoEstimado: z.number().nonnegative('Custo deve ser positivo').default(0),
  tempoEstimado: z.number().nonnegative('Tempo deve ser positivo em minutos').default(0),
});

export const OrdensServicoUpdateSchema = OrdensServicoCreateSchema.omit({ empresa_id: type: true }).partial();
export type OrdensServicoCreate = z.infer<typeof OrdensServicoCreateSchema>;
export type OrdensServicoUpdate = z.infer<typeof OrdensServicoUpdateSchema>;

// =====================
// MATERIAIS Schema
// =====================

export const MateriaisCreateSchema = z.object({
  empresa_id: EmpresaIdSchema,
  nome: z.string().min(3).max(255),
  descricao: z.string().optional(),
  categoria: z.enum(['peca', 'consumivel', 'ferramenta', 'outro']),
  valor_unitario: z.number().nonnegative('Valor deve ser positivo'),
  quantidade_minima: z.number().nonnegative().int().default(0),
  unidade_medida: z.enum(['unidade', 'metro', 'kg', 'litro', 'outro']).default('unidade'),
  sku: z.string().max(50).optional(),
  status: z.enum(['ativo', 'inativo', 'descontinuado']).default('ativo'),
});

export const MateriaisUpdateSchema = MateriaisCreateSchema.omit({ empresa_id: true }).partial();
export type MateriaisCreate = z.infer<typeof MateriaisCreateSchema>;
export type MateriaisUpdate = z.infer<typeof MateriaisUpdateSchema>;

// =====================
// MECÂNICOS Schema
// =====================

export const MecanicosCreateSchema = z.object({
  empresa_id: EmpresaIdSchema,
  nome: z.string().min(3).max(255),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional(),
  email: z.string().email('Email inválido').optional(),
  telefone: z.string().optional(),
  especialidade: z.string().max(100).optional(),
  status: z.enum(['ativo', 'inativo', 'afastado']).default('ativo'),
});

export const MecanicosUpdateSchema = MecanicosCreateSchema.omit({ empresa_id: true }).partial();
export type MecanicosCreate = z.infer<typeof MecanicosCreateSchema>;
export type MecanicosUpdate = z.infer<typeof MecanicosUpdateSchema>;

// =====================
// Utility Functions
// =====================

/**
 * Safe parse wrapper with detailed error messages
 * Returns { success: boolean, data?: T, errors?: Record<string, string> }
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: boolean; data?: T; errors?: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path || 'root'] = issue.message;
  });

  return { success: false, errors };
}

/**
 * Throw on parse error (for server-side / RPC usage)
 */
export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
