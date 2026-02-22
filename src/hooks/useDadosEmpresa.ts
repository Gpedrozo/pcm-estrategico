import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

export interface Empresa {
  id?: string
  nome: string
  logo_url?: string
  cor_primaria?: string
}

export function useDadosEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)

  async function carregarEmpresa() {
    const { data, error } = await supabase
      .from("empresa")
      .select("*")
      .single()

    if (!error) {
      setEmpresa(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarEmpresa()
  }, [])

  return { empresa, loading, reload: carregarEmpresa }
}

export function useUpdateEmpresa() {
  async function updateEmpresa(dados: Partial<Empresa>) {
    const { error } = await supabase
      .from("empresa")
      .update(dados)
      .eq("id", 1)

    if (error) {
      console.error("Erro ao atualizar empresa:", error)
      throw error
    }
  }

  return { updateEmpresa }
}

export async function uploadLogo(file: File) {
  const fileName = `${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from("logos")
    .upload(fileName, file)

  if (error) {
    console.error("Erro upload logo:", error)
    throw error
  }

  const { data } = supabase.storage
    .from("logos")
    .getPublicUrl(fileName)

  return data.publicUrl
    }
