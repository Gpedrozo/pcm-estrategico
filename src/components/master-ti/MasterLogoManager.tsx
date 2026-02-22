import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, Image as ImageIcon } from "lucide-react"

import {
  useDadosEmpresa,
  useUpdateDadosEmpresa,
  uploadLogo,
} from "@/hooks/useDadosEmpresa"

import { useToast } from "@/hooks/use-toast"

const LOGO_SLOTS = [
  {
    key: "logo_principal_url",
    label: "Logo Principal",
    desc: "Usada no topo do sistema",
  },
  {
    key: "logo_menu_url",
    label: "Logo Menu",
    desc: "Usada no menu lateral",
  },
  {
    key: "logo_login_url",
    label: "Logo Login",
    desc: "Tela de login",
  },
  {
    key: "logo_pdf_url",
    label: "Logo PDF",
    desc: "Documentos",
  },
  {
    key: "logo_os_url",
    label: "Logo Ordem de Serviço",
    desc: "Impressão O.S",
  },
  {
    key: "logo_relatorio_url",
    label: "Logo Relatórios",
    desc: "Relatórios",
  },
] as const

export function MasterLogoManager() {
  const { data: empresa, isLoading } = useDadosEmpresa()
  const updateMutation = useUpdateDadosEmpresa()
  const { toast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState<string | null>(null)
  const [activeSlot, setActiveSlot] = useState<string | null>(null)

  const triggerUpload = (slot: string) => {
    setActiveSlot(slot)
    fileInputRef.current?.click()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file || !activeSlot || !empresa) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Selecione uma imagem",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(activeSlot)

      const path = `${activeSlot}`

      const url = await uploadLogo(file, path)

      await updateMutation.mutateAsync({
        id: empresa.id,
        [activeSlot]: url,
      })

      toast({
        title: "Logo atualizada",
        description: "A nova logo já está ativa.",
      })
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUploading(null)
      setActiveSlot(null)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    )
  }

  if (!empresa) {
    return (
      <div className="text-center p-10 text-muted-foreground">
        Nenhuma empresa cadastrada.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LOGO_SLOTS.map((slot) => {
          const url = empresa?.[slot.key as keyof typeof empresa] as string

          return (
            <Card key={slot.key}>
              <CardHeader>
                <CardTitle className="text-sm">{slot.label}</CardTitle>
                <p className="text-xs text-muted-foreground">{slot.desc}</p>
              </CardHeader>

              <CardContent>
                <div className="h-28 rounded-md bg-muted flex items-center justify-center overflow-hidden mb-3">

                  {url ? (
                    <img
                      src={url}
                      alt="logo"
                      className="max-h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}

                </div>

                <Button
                  onClick={() => triggerUpload(slot.key)}
                  className="w-full gap-2"
                  variant="outline"
                  disabled={uploading === slot.key}
                >
                  {uploading === slot.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}

                  Alterar Logo
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
