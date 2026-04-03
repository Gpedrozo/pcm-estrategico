import { z } from 'zod';

/**
 * FASE 2: Zod Schema Standardization
 * Module: Equipamentos
 * Date: 2026-04-02
 * 
 * Schemas:
 * - equipamentoSchema: Full response data (with server-generated fields)
 * - equipamentoCreateSchema: Client input for POST operations
 * - equipamentoUpdateSchema: Client input for PATCH operations
 */

// =====================
// RESPONSE SCHEMA (what server returns)
// =====================

export const equipamentoSchema = z.object({
  id: z.string().uuid('ID do equipamento inválido').optional(),
  empresa_id: z.string().uuid('ID da empresa inválido').optional(),
  tag: z.string().min(2, 'TAG é obrigatória (mínimo 2 caracteres)'),
  nome: z.string().min(3, 'Nome é obrigatório (mínimo 3 caracteres)'),
  criticidade: z.enum(['A', 'B', 'C']).default('C'),
  nivel_risco: z.enum(['ALTO', 'MEDIO', 'BAIXO']).default('MEDIO'),
  localizacao: z.string().optional().nullable(),
  fabricante: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  numero_serie: z.string().optional().nullable(),
  data_instalacao: z.string().optional().nullable(),
  sistema_id: z.string().uuid('ID do sistema inválido').optional().nullable(),
  ativo: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// =====================
// CREATE SCHEMA (client → POST /api/equipamentos)
// =====================

export const equipamentoCreateSchema = z.object({
  tag: z.string()
    .min(2, 'TAG é obrigatória (mínimo 2 caracteres)')
    .max(50, 'TAG deve ter no máximo 50 caracteres'),
  nome: z.string()
    .min(3, 'Nome é obrigatório (mínimo 3 caracteres)')
    .max(255, 'Nome deve ter no máximo 255 caracteres'),
  criticidade: z.enum(['A', 'B', 'C'], { description: 'Nível de criticidade do equipamento' })
    .default('C'),
  nivel_risco: z.enum(['ALTO', 'MEDIO', 'BAIXO'], { description: 'Nível de risco operacional' })
    .default('MEDIO'),
  localizacao: z.string()
    .max(255, 'Localização deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  fabricante: z.string()
    .max(255, 'Fabricante deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  modelo: z.string()
    .max(255, 'Modelo deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  numero_serie: z.string()
    .max(255, 'Número de série deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  data_instalacao: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  sistema_id: z.string()
    .uuid('ID do sistema deve ser um UUID válido')
    .optional()
    .nullable(),
  ativo: z.boolean()
    .default(true),
});

// =====================
// UPDATE SCHEMA (client → PATCH /api/equipamentos/:id)
// =====================

export const equipamentoUpdateSchema = equipamentoCreateSchema.partial();

// =====================
// TYPE EXPORTS (TypeScript type inference)
// =====================

export type EquipamentoFormData = z.infer<typeof equipamentoSchema>;
export type EquipamentoCreate = z.infer<typeof equipamentoCreateSchema>;
export type EquipamentoUpdate = z.infer<typeof equipamentoUpdateSchema>;
