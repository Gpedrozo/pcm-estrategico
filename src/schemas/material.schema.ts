import { z } from 'zod';

export const materialSchema = z.object({
  codigo: z.string().min(2, 'Código é obrigatório (mínimo 2 caracteres)'),
  nome: z.string().min(3, 'Nome é obrigatório (mínimo 3 caracteres)'),
  unidade: z.string().default('UN'),
  custo_unitario: z.number().min(0, 'Custo unitário deve ser >= 0').default(0),
  estoque_atual: z.number().min(0, 'Estoque atual deve ser >= 0').default(0),
  estoque_minimo: z.number().min(0, 'Estoque mínimo deve ser >= 0').default(0),
  localizacao: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
});

export type MaterialFormData = z.infer<typeof materialSchema>;
