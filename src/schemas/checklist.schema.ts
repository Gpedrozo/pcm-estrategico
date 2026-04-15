import { z } from 'zod';

/**
 * Schema para itens de checklist usados em planos preventivos,
 * execuções preventivas e permissões de trabalho (SSMA).
 *
 * Campos obrigatórios: id, descricao
 * Campos opcionais: concluido, obrigatorio, observacao
 */
export const ChecklistItemSchema = z.object({
  id: z.string().min(1),
  descricao: z.string().min(1),
  obrigatorio: z.boolean().default(false),
  concluido: z.boolean().default(false),
  observacao: z.string().optional(),
});

export const ChecklistSchema = z.array(ChecklistItemSchema);

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type Checklist = z.infer<typeof ChecklistSchema>;

/**
 * Faz parse seguro de um valor desconhecido para Checklist[].
 * Se o valor for inválido, retorna [].
 */
export function parseChecklist(raw: unknown): Checklist {
  if (!raw) return [];
  const result = ChecklistSchema.safeParse(raw);
  return result.success ? result.data : [];
}
