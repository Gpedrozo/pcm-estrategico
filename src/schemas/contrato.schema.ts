import { z } from 'zod';

export const contratoSchema = z.object({
  numero_contrato: z.string().min(3, 'Número do contrato é obrigatório (mínimo 3 caracteres)'),
  titulo: z.string().min(5, 'Título é obrigatório (mínimo 5 caracteres)'),
  descricao: z.string().optional().nullable(),
  fornecedor_id: z.string().optional().nullable(),
  tipo: z.enum(['SERVICO', 'MATERIAL', 'MISTO', 'LOCACAO']).default('SERVICO'),
  status: z.enum(['ATIVO', 'SUSPENSO', 'ENCERRADO', 'VENCIDO']).default('ATIVO'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim: z.string().optional().nullable(),
  valor_total: z.number().min(0, 'Valor total deve ser maior ou igual a zero').optional().default(0),
  valor_mensal: z.number().min(0, 'Valor mensal deve ser maior ou igual a zero').optional().default(0),
  sla_atendimento_horas: z.number().min(1, 'SLA de atendimento deve ser de no mínimo 1 hora').optional().default(4),
  sla_resolucao_horas: z.number().min(1, 'SLA de resolução deve ser de no mínimo 1 hora').optional().default(24),
  responsavel_nome: z.string().optional().nullable(),
  penalidade_descricao: z.string().optional().nullable(),
});

export type ContratoFormData = z.infer<typeof contratoSchema>;
