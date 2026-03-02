import { FolderTree } from 'lucide-react';

export const OWNER_FILES = [
  {
    path: '/master-ti',
    description: 'Tela principal do owner (Master TI), acessível para perfil administrativo apropriado.',
  },
  {
    path: '/usuarios',
    description: 'Gestão administrativa de usuários e perfis vinculados ao owner.',
  },
  {
    path: '/auditoria',
    description: 'Histórico administrativo de ações relacionadas ao owner.',
  },
];

export default function ArquivosOwner() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Arquivos do Owner</h1>
        <p className="text-muted-foreground">
          Referências dos arquivos solicitados para administração do owner (Master TI).
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="space-y-4">
          {OWNER_FILES.map((file) => (
            <div key={file.path} className="border border-border rounded-md p-3">
              <div className="flex items-center gap-2 text-sm font-mono text-primary">
                <FolderTree className="h-4 w-4" />
                {file.path}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{file.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
