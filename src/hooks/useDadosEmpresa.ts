import { useState, useEffect } from "react"

export interface Empresa {
  id?: string
  nome: string
  cnpj: string
  telefone: string
  email: string
  endereco: string
  logo?: string
}

export function useDadosEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const data = localStorage.getItem("empresa")

    if (data) {
      setEmpresa(JSON.parse(data))
    }

    setLoading(false)
  }, [])

  return { empresa, loading }
}

export function useUpdateDadosEmpresa() {
  const [loading, setLoading] = useState(false)

  async function updateEmpresa(data: Empresa) {
    setLoading(true)

    localStorage.setItem("empresa", JSON.stringify(data))

    setLoading(false)

    return true
  }

  return { updateEmpresa, loading }
}

/*
Alias para compatibilidade com componentes antigos
*/
export function useUpdateEmpresa() {
  return useUpdateDadosEmpresa()
}

export async function uploadLogo(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve(reader.result as string)
    }

    reader.readAsDataURL(file)
  })
}
