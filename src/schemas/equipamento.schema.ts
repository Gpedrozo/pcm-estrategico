import { z } from 'zod';

export const equipamentoBaseSchema = z.object({
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
  temporario: z.boolean().default(false),
  data_vencimento: z.string().optional().nullable(),
  origem: z.enum(['proprio', 'locado', 'terceiro']).default('proprio'),
});

export const equipamentoSchema = equipamentoBaseSchema.refine(
  (data) => !data.temporario || (data.temporario && data.data_vencimento),
  { message: 'Data de vencimento é obrigatória para ativos temporários', path: ['data_vencimento'] },
);

export type EquipamentoFormData = z.infer<typeof equipamentoSchema>;
