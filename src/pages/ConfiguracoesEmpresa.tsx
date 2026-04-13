import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Lock, Save, Upload, Trash2, Image, FileText } from 'lucide-react'
import { MeuContratoTab } from '@/components/empresa/MeuContratoTab'
import { useDadosEmpresa, uploadLogo } from '@/hooks/useDadosEmpresa'
import {
  useConfiguracoesOperacionaisEmpresa,
  useSalvarConfiguracoesOperacionaisEmpresa,
  type ConfiguracoesOperacionaisEmpresa,
} from '@/hooks/useConfiguracoesOperacionaisEmpresa'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'

const emptyForm: ConfiguracoesOperacionaisEmpresa = {
  endereco: '',
  telefone: '',
  email: '',
  site: '',
  responsavel_nome: '',
  responsavel_cargo: '',
  observacoes: '',
}

export default function ConfiguracoesEmpresa() {
  const { data: dadosEmpresa, isLoading: loadingEmpresa } = useDadosEmpresa()
  const { data: operacionais, isLoading: loadingOperacionais } = useConfiguracoesOperacionaisEmpresa()
  const salvarOperacionais = useSalvarConfiguracoesOperacionaisEmpresa()
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<ConfiguracoesOperacionaisEmpresa>(emptyForm)

  // --- Logo management via configuracoes_sistema (tenant.logos) ---
  const logosQuery = useQuery({
    queryKey: ['tenant-logos', tenantId],
    queryFn: async () => {
      if (!tenantId) return { logo_url: null as string | null, logo_os_url: null as string | null }
      const { data } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('empresa_id', tenantId)
        .eq('chave', 'tenant.logos')
        .maybeSingle()
      const val = (data?.valor ?? {}) as Record<string, string | null>
      return {
        logo_url: val.logo_url ?? null,
        logo_os_url: val.logo_os_url ?? null,
      }
    },
    enabled: Boolean(tenantId),
  })

  const logos = logosQuery.data ?? { logo_url: null, logo_os_url: null }

  const salvarLogoMutation = useMutation({
    mutationFn: async ({ logoKey, url }: { logoKey: 'logo_url' | 'logo_os_url'; url: string | null }) => {
      if (!tenantId) throw new Error('Tenant não identificado.')

      // Read current logos, merge with new value
      const { data: current } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('empresa_id', tenantId)
        .eq('chave', 'tenant.logos')
        .maybeSingle()

      const prev = (current?.valor ?? {}) as Record<string, string | null>
      const merged = { ...prev, [logoKey]: url }

      const { error } = await supabase
        .from('configuracoes_sistema')
        .upsert(
          { empresa_id: tenantId, chave: 'tenant.logos', valor: merged, updated_at: new Date().toISOString() },
          { onConflict: 'empresa_id,chave' },
        )

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-logos', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['dados-empresa'] })
      toast({ title: 'Logo atualizada', description: 'Logomarca salva com sucesso.' })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar logomarca.'
      toast({ title: 'Erro ao atualizar logo', description: message, variant: 'destructive' })
    },
  })

  const handleLogoUpload = async (logoKey: 'logo_url' | 'logo_os_url', file?: File | null) => {
    if (!file) return

    try {
      const extension = file.name.split('.').pop() || 'png'
      const filePath = `${logoKey.replace('_url', '')}-${Date.now()}.${extension}`
      const publicUrl = await uploadLogo(file, filePath)
      await salvarLogoMutation.mutateAsync({ logoKey, url: publicUrl })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha no upload da logomarca.'
      toast({
        title: 'Erro no upload',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const handleLogoRemove = async (logoKey: 'logo_url' | 'logo_os_url') => {
    await salvarLogoMutation.mutateAsync({ logoKey, url: null })
  }

  useEffect(() => {
    if (!operacionais?.valor) {
      setForm(emptyForm)
      return
    }

    setForm({
      endereco: operacionais.valor.endereco ?? '',
      telefone: operacionais.valor.telefone ?? '',
      email: operacionais.valor.email ?? '',
      site: operacionais.valor.site ?? '',
      responsavel_nome: operacionais.valor.responsavel_nome ?? '',
      responsavel_cargo: operacionais.valor.responsavel_cargo ?? '',
      observacoes: operacionais.valor.observacoes ?? '',
    })
  }, [operacionais])

  const dadosLegais = useMemo(
    () => ({
      razao_social: dadosEmpresa?.razao_social ?? '-',
      nome_fantasia: dadosEmpresa?.nome_fantasia ?? '-',
      cnpj: dadosEmpresa?.cnpj ?? '-',
    }),
    [dadosEmpresa],
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    await salvarOperacionais.mutateAsync(form, {
      onSuccess: () => {
        toast({
          title: 'Configurações salvas',
          description: 'Dados operacionais atualizados com sucesso.',
        })
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Falha ao salvar configurações operacionais.'
        toast({
          title: 'Erro ao salvar',
          description: message,
          variant: 'destructive',
        })
      },
    })
  }

  const isLoading = loadingEmpresa || loadingOperacionais || logosQuery.isLoading

  if (isLoading) {
    return (
      <div className="module-page space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="module-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações da Empresa</h1>
        <p className="text-muted-foreground">Dados legais são somente leitura no tenant. Ajuste aqui apenas dados operacionais.</p>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="contrato" className="gap-2">
            <FileText className="h-4 w-4" />
            Meu Contrato
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-4 space-y-6">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            Dados Legais (somente leitura)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <Label>Razão Social</Label>
            <Input value={dadosLegais.razao_social} readOnly disabled />
          </div>
          <div>
            <Label>Nome Fantasia</Label>
            <Input value={dadosLegais.nome_fantasia} readOnly disabled />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={dadosLegais.cnpj} readOnly disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="h-4 w-4" />
            Logomarcas do Tenant (empresa cliente)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-border p-4">
              <Label>Logo Principal (menu/login)</Label>
              <div className="h-24 rounded-md border border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                {logos.logo_url ? (
                  <img src={logos.logo_url} alt="Logo principal" className="max-h-full max-w-full object-contain p-2" />
                ) : (
                  <span className="text-xs text-muted-foreground">Sem logomarca</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <label>
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleLogoUpload('logo_url', e.target.files?.[0])}
                    />
                  </label>
                </Button>
                {logos.logo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleLogoRemove('logo_url')}
                    className="gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    Remover
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-4">
              <Label>Logo para O.S / PDF</Label>
              <div className="h-24 rounded-md border border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                {logos.logo_os_url ? (
                  <img src={logos.logo_os_url} alt="Logo O.S" className="max-h-full max-w-full object-contain p-2" />
                ) : (
                  <span className="text-xs text-muted-foreground">Sem logomarca</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <label>
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleLogoUpload('logo_os_url', e.target.files?.[0])}
                    />
                  </label>
                </Button>
                {logos.logo_os_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleLogoRemove('logo_os_url')}
                    className="gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Configurações Operacionais (editável no tenant)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Endereço Operacional</Label>
                <Input value={form.endereco ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, endereco: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Telefone Operacional</Label>
                <Input value={form.telefone ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, telefone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email Operacional</Label>
                <Input type="email" value={form.email ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Input value={form.site ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, site: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Responsável Operacional</Label>
                <Input value={form.responsavel_nome ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, responsavel_nome: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Cargo do Responsável</Label>
                <Input value={form.responsavel_cargo ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, responsavel_cargo: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações Operacionais</Label>
              <Textarea rows={4} value={form.observacoes ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))} />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={salvarOperacionais.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Configurações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="contrato" className="mt-4">
          <MeuContratoTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
