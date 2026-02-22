import { useDadosEmpresa, useUpdateEmpresa, uploadLogo } from "@/hooks/useDadosEmpresa"
import { useState } from "react"

export function MasterLogoManager() {
  const { data: empresa, isLoading } = useDadosEmpresa()
  const updateEmpresa = useUpdateEmpresa()

  const [uploading, setUploading] = useState(false)

  if (isLoading) return <div>Carregando...</div>

  if (!empresa) return <div>Nenhuma empresa cadastrada.</div>

  async function handleUpload(e: any) {
    try {
      setUploading(true)

      const file = e.target.files[0]

      const url = await uploadLogo(file, `logo-principal.png`)

      await updateEmpresa.mutateAsync({
        id: empresa.id,
        logo_principal_url: url,
      })

    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: 20 }}>

      <h2>Logo Atual</h2>

      {empresa.logo_principal_url && (
        <img
          src={empresa.logo_principal_url}
          style={{
            height: 120,
            objectFit: "contain",
            marginBottom: 20
          }}
        />
      )}

      <div>
        <input
          type="file"
          onChange={handleUpload}
        />
      </div>

      {uploading && <p>Enviando...</p>}
    </div>
  )
}
