import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

export interface DadosEmpresa {
  id: string
  razao_social: string
  nome_fantasia: string
  logo_principal_url: string
  logo_menu_url: string
  logo_login_url: string
}

export function useDadosEmpresa() {
  return useQuery({
    queryKey: ["empresa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dados_empresa")
        .select("*")
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data
    },
  })
}

export function useUpdateEmpresa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dados: Partial<DadosEmpresa> & { id: string }) => {
      const { id, ...rest } = dados

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
      queryClient.invalidateQueries({ queryKey: ["empresa"] })
    },
  })
}

export async function uploadLogo(file: File, path: string) {
  const { error } = await supabase.storage
    .from("logos")
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage
    .from("logos")
    .getPublicUrl(path)

  return data.publicUrl
}
