import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contratoSchema, type ContratoFormData } from '@/schemas/contrato.schema'
import { useCreateContrato, useContratos } from '@/hooks/useContratos'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

export default function Contratos() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { data } = useContratos()
  const createContrato = useCreateContrato()
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ContratoFormData>({
    resolver: zodResolver(contratoSchema)
  })

  const onSubmit = async (form: ContratoFormData) => {
    try {
      await createContrato.mutateAsync({
        ...form,
        responsavel_nome: user?.email
      })

      toast({
        title: 'Contrato criado',
        description: 'Registro salvo com sucesso'
      })

      reset()
      setOpen(false)

    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message,
        variant: 'destructive'
      })
    }
  }

  return (
    <div>
      {/* Mantém seu layout atual aqui */}

      <form onSubmit={handleSubmit(onSubmit)}>
        <input {...register('numero_contrato')} />
        {errors.numero_contrato?.message}
      </form>
    </div>
  )
}
