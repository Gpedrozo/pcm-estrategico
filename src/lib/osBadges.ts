import type { StatusOS, TipoOS } from '@/types'

const TIPO_OS_VALUES: TipoOS[] = ['CORRETIVA', 'PREVENTIVA', 'PREDITIVA', 'INSPECAO', 'MELHORIA']
const STATUS_OS_VALUES: StatusOS[] = ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_MATERIAL', 'AGUARDANDO_APROVACAO', 'FECHADA', 'CANCELADA']

export function normalizeOSType(value: string): TipoOS {
  return TIPO_OS_VALUES.includes(value as TipoOS) ? (value as TipoOS) : 'CORRETIVA'
}

export function normalizeOSStatus(value: string): StatusOS {
  return STATUS_OS_VALUES.includes(value as StatusOS) ? (value as StatusOS) : 'ABERTA'
}
