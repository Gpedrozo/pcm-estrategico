import { z } from 'zod'

export const contratoSchema = z.object({
  numero_contrato: z.string().min(3, 'Número obrigatório'),
  titulo: z.string().min(5, 'Título obrigatório'),
  descricao: z.string().optional(),
  fornecedor_id: z.string().optional(),
  tipo: z.enum(['SERVICO', 'MATERIAL', 'MISTO', 'LOCACAO']),
  status: z.enum(['ATIVO', 'SUSPENSO', 'ENCERRADO']),
  data_inicio: z.string(),
  data_fim: z.string().optional(),
  valor_total: z.number().min(0),
  valor_mensal: z.number().min(0),
  sla_atendimento_horas: z.number().min(1),
  sla_resolucao_horas: z.number().min(1),
  responsavel_nome: z.string().optional(),
  penalidade_descricao: z.string().optional(),
})
.refine(
  (data) =>
    !data.data_fim ||
    new Date(data.data_fim) >= new Date(data.data_inicio),
  {
    message: 'Data fim deve ser maior que início',
    path: ['data_fim'],
  }
)

export type ContratoFormData = z.infer<typeof contratoSchema>
