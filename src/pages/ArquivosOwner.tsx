import { Shield, FolderTree } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const OWNER_FILES = [
  {
    path: 'src/pages/MasterTI.tsx',
    description: 'Página principal do painel do owner (Master TI).',
  },
  {
    path: 'src/components/master-ti/',
    description: 'Componentes e módulos administrativos do owner.',
  },
  {
    path: 'src/components/layout/AppSidebar.tsx',
    description: 'Menu lateral com acesso da administração ao owner.',
  },
  {
    path: 'src/contexts/AuthContext.tsx',
    description: 'Controle de perfil MASTER_TI e permissões de acesso.',
  },
];

export default function ArquivosOwner() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas administradores podem visualizar os arquivos do owner.</p>
        </div>
      </div>
    );
  }

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
