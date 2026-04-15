import { z } from 'zod';

export const ordemServicoSchema = z.object({
  tipo: z.enum(['CORRETIVA', 'PREVENTIVA', 'PREDITIVA', 'INSPECAO', 'MELHORIA', 'LUBRIFICACAO']),
  prioridade: z.enum(['URGENTE', 'ALTA', 'MEDIA', 'BAIXA']).default('MEDIA'),
  tag: z.string().min(1, 'TAG do equipamento é obrigatória'),
  equipamento: z.string().min(1, 'Nome do equipamento é obrigatório'),
  solicitante: z.string().min(2, 'Nome do solicitante é obrigatório'),
  problema: z.string().min(5, 'Descrição do problema é obrigatória (mínimo 5 caracteres)'),
  tempo_estimado: z.number().min(0).optional().nullable(),
  usuario_abertura: z.string().optional().nullable(),
  mecanico_responsavel_id: z.string().uuid().optional().nullable(),
  mecanico_responsavel_codigo: z.string().optional().nullable(),
  maintenance_schedule_id: z.string().uuid().optional().nullable(),
});

export const ordemServicoUpdateSchema = z.object({
  status: z.enum(['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO', 'FECHADA', 'CANCELADA']).optional(),
  data_fechamento: z.string().optional().nullable(),
  usuario_fechamento: z.string().optional().nullable(),
  modo_falha: z.string().optional().nullable(),
  causa_raiz: z.string().optional().nullable(),
  acao_corretiva: z.string().optional().nullable(),
  licoes_aprendidas: z.string().optional().nullable(),
});

export type OrdemServicoFormData = z.infer<typeof ordemServicoSchema>;
export type OrdemServicoUpdateData = z.infer<typeof ordemServicoUpdateSchema>;
