import { z } from 'zod';

export const plantaSchema = z.object({
  codigo: z.string().min(2, 'Código é obrigatório (mínimo 2 caracteres)'),
  nome: z.string().min(3, 'Nome é obrigatório (mínimo 3 caracteres)'),
  endereco: z.string().optional().nullable(),
  responsavel: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
});

export const areaSchema = z.object({
  planta_id: z.string().uuid('ID da planta inválido'),
  codigo: z.string().min(2, 'Código é obrigatório (mínimo 2 caracteres)'),
  nome: z.string().min(3, 'Nome é obrigatório (mínimo 3 caracteres)'),
  descricao: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
});

export const sistemaSchema = z.object({
  area_id: z.string().uuid('ID da área inválido'),
  codigo: z.string().min(2, 'Código é obrigatório (mínimo 2 caracteres)'),
  nome: z.string().min(3, 'Nome é obrigatório (mínimo 3 caracteres)'),
  descricao: z.string().optional().nullable(),
  funcao_principal: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
});

export type PlantaFormData = z.infer<typeof plantaSchema>;
export type AreaFormData = z.infer<typeof areaSchema>;
export type SistemaFormData = z.infer<typeof sistemaSchema>;
