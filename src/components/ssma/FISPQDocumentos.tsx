import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Paperclip, Upload, ExternalLink, FileText, Trash2, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FichaSegurancaRow } from '@/hooks/useFichasSeguranca';

export interface DocumentoAnexo {
  nome: string;
  tipo: string;
  url: string;
  data_upload: string;
  observacao?: string;
}

interface Props {
  ficha: FichaSegurancaRow;
  onArquivoSalvo: (fichaId: string, arquivo_url: string | null, documentos_anexos: DocumentoAnexo[]) => void;
}

function parseDocumentosAnexos(raw: unknown): DocumentoAnexo[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter((d): d is DocumentoAnexo =>
    typeof d === 'object' && d !== null && 'url' in d && 'nome' in d
  );
}

export function FISPQDocumentos({ ficha, onArquivoSalvo }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [nomeAnexo, setNomeAnexo] = useState('');
  const [obsAnexo, setObsAnexo] = useState('');
  const mainInputRef = useRef<HTMLInputElement>(null);
  const anexoInputRef = useRef<HTMLInputElement>(null);

  const documentos = parseDocumentosAnexos((ficha as any).documentos_anexos);

  async function uploadFile(file: File, prefix: string): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `ssma/fispq/${ficha.empresa_id}/${prefix}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documentos').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('documentos').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleMainUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 20 MB', variant: 'destructive' });
      return;
    }
    setUploadingMain(true);
    try {
      const url = await uploadFile(file, 'fispq_principal');
      onArquivoSalvo(ficha.id, url, documentos);
      toast({ title: 'FISPQ enviada', description: 'Documento principal salvo com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingMain(false);
      if (mainInputRef.current) mainInputRef.current.value = '';
    }
  }

  async function handleAnexoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 20 MB', variant: 'destructive' });
      return;
    }
    setUploadingAnexo(true);
    try {
      const url = await uploadFile(file, 'anexo');
      const novoDoc: DocumentoAnexo = {
        nome: nomeAnexo || file.name,
        tipo: file.type,
        url,
        data_upload: new Date().toISOString(),
        observacao: obsAnexo || undefined,
      };
      const novosDocumentos = [...documentos, novoDoc];
      onArquivoSalvo(ficha.id, ficha.arquivo_url, novosDocumentos);
      toast({ title: 'Documento anexado', description: `"${novoDoc.nome}" salvo com sucesso.` });
      setNomeAnexo('');
      setObsAnexo('');
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAnexo(false);
      if (anexoInputRef.current) anexoInputRef.current.value = '';
    }
  }

  async function handleRemoverAnexo(index: number) {
    const novosDocumentos = documentos.filter((_, i) => i !== index);
    onArquivoSalvo(ficha.id, ficha.arquivo_url, novosDocumentos);
    toast({ title: 'Anexo removido' });
  }

  const temArquivo = !!ficha.arquivo_url;
  const qtdAnexos = documentos.length;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={`gap-1.5 ${temArquivo || qtdAnexos > 0 ? 'text-primary' : 'text-muted-foreground'}`}
        title="Gerenciar documentos"
      >
        <Paperclip className="h-3.5 w-3.5" />
        {temArquivo || qtdAnexos > 0 ? (
          <Badge variant="secondary" className="text-xs px-1 py-0 h-4">{(temArquivo ? 1 : 0) + qtdAnexos}</Badge>
        ) : (
          <span className="text-xs">Anexar</span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos — {ficha.nome_produto}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Documento Principal (FISPQ) */}
            <div className="space-y-2">
              <Label className="font-semibold">Documento Principal (FISPQ/FDS)</Label>
              {ficha.arquivo_url ? (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm flex-1 truncate">FISPQ — {ficha.nome_produto}</span>
                  <a href={ficha.arquivo_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a href={ficha.arquivo_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => mainInputRef.current?.click()}
                    disabled={uploadingMain}
                    title="Substituir arquivo"
                  >
                    {uploadingMain ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => mainInputRef.current?.click()}
                >
                  {uploadingMain ? (
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-2" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  )}
                  <p className="text-sm text-muted-foreground">Clique para enviar a FISPQ original (PDF, imagem)</p>
                  <p className="text-xs text-muted-foreground mt-1">Máximo 20 MB · PDF, PNG, JPG</p>
                </div>
              )}
              <input
                ref={mainInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleMainUpload}
              />
            </div>

            {/* Documentos Anexos */}
            <div className="space-y-3">
              <Label className="font-semibold">Documentos Complementares do Fornecedor</Label>
              <p className="text-xs text-muted-foreground">Laudos, análises, certificados de conformidade, fichas técnicas enviadas pela empresa fornecedora de químicos.</p>

              {documentos.length > 0 && (
                <div className="space-y-2">
                  {documentos.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.nome}</p>
                        {doc.observacao && <p className="text-xs text-muted-foreground truncate">{doc.observacao}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(doc.data_upload).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemoverAnexo(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário para novo anexo */}
              <div className="border border-border rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Adicionar novo documento</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome do documento</Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Ex: Laudo de Toxicidade"
                      value={nomeAnexo}
                      onChange={e => setNomeAnexo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Observação (opcional)</Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Ex: Emitido em mar/2026"
                      value={obsAnexo}
                      onChange={e => setObsAnexo(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => anexoInputRef.current?.click()}
                  disabled={uploadingAnexo}
                >
                  {uploadingAnexo ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                  ) : (
                    <><Upload className="h-4 w-4" />Selecionar arquivo</>
                  )}
                </Button>
                <input
                  ref={anexoInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={handleAnexoUpload}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
