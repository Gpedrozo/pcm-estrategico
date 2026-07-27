import { z } from 'zod';

export const mecanicoSchema = z.object({
  nome: z.string().min(3, 'Nome é obrigatório (mínimo 3 caracteres)'),
  telefone: z.string().optional().nullable(),
  tipo: z
    .enum(['INTERNO', 'PROPRIO', 'TERCEIRIZADO'])
    .default('PROPRIO'),
  especialidade: z.string().optional().nullable(),
  custo_hora: z.number().min(0, 'Custo/hora deve ser >= 0').optional().nullable(),
  ativo: z.boolean().default(true),
  codigo_acesso: z.string().optional().nullable(),
  senha_acesso: z.string().min(4, 'Senha deve ter no mínimo 4 caracteres').optional().nullable(),
  escala_trabalho: z.string().optional().nullable(),
  folgas_planejadas: z.string().optional().nullable(),
  ferias_inicio: z.string().optional().nullable(),
  ferias_fim: z.string().optional().nullable(),
});

export type MecanicoFormData = z.infer<typeof mecanicoSchema>;
