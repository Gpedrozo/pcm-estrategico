import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

export interface DadosEmpresa {
  id: string
  razao_social: string
  nome_fantasia: string
  cnpj: string
  inscricao_estadual: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  whatsapp: string
  email: string
  site: string
  responsavel_nome: string
  responsavel_cargo: string
  logo_principal_url: string
  logo_menu_url: string
  logo_login_url: string
  logo_pdf_url: string
  logo_os_url: string
  logo_relatorio_url: string
}

export function useDadosEmpresa() {
  return useQuery({
    queryKey: ["dados_empresa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dados_empresa")
        .select("*")
        .limit(1)
        .maybeSingle()

      if (error) throw error

      return data as DadosEmpresa | null
    },
  })
}

export function useUpdateDadosEmpresa() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (updates: Partial<DadosEmpresa> & { id: string }) => {
      const { id, ...rest } = updates

      const { data, error } = await supabase
        .from("dados_empresa")
        .update(rest)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      return data
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dados_empresa"] })

      toast({
        title: "Dados atualizados",
        description: "Empresa atualizada com sucesso",
      })
    },

    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

export async function uploadLogo(file: File, path: string): Promise<string> {
  const { error } = await supabase.storage
    .from("logos")
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from("logos").getPublicUrl(path)

  return data.publicUrl
}
