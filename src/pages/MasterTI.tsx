
// Importações React e hooks
import { useState, useMemo } from "react";

// Importa o contexto de autenticação
import { useAuth } from "@/contexts/AuthContext";

// Importa ícones da biblioteca lucide-react
import {
  Shield,
  Users,
  Database,
  Activity,
  Settings,
  FileText,
  Lock,
  ServerCrash,
  Building2,
  Image,
  ShieldCheck,
} from "lucide-react";

// Importa componentes de Tabs do seu sistema
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Importa todos os componentes das abas do MasterTI
import { MasterUsersManager } from "@/components/master-ti/MasterUsersManager";
import { MasterDatabaseManager } from "@/components/master-ti/MasterDatabaseManager";
import { MasterSystemMonitor } from "@/components/master-ti/MasterSystemMonitor";
import { MasterGlobalSettings } from "@/components/master-ti/MasterGlobalSettings";
import { MasterAuditLogs } from "@/components/master-ti/MasterAuditLogs";
import { MasterSecurity } from "@/components/master-ti/MasterSecurity";
import { MasterEmpresaData } from "@/components/master-ti/MasterEmpresaData";
import { MasterLogoManager } from "@/components/master-ti/MasterLogoManager";
import { MasterPermissionsManager } from "@/components/master-ti/MasterPermissionsManager";

// Define os tipos possíveis de abas
type TabKey =
  | "users"
  | "permissions"
  | "empresa"
  | "logos"
  | "database"
  | "monitor"
  | "settings"
  | "audit"
  | "security";

// Componente principal do painel MasterTI
export default function MasterTI() {
  // Pega os dados do usuário logado do contexto de autenticação
  const auth = useAuth();

  // Garante que isMasterTI sempre será booleano, evita undefined
  const isMasterTI = Boolean(auth?.isMasterTI);

  // Estado para controlar qual aba está ativa
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  // Configuração centralizada das abas para evitar erros manuais
  const tabsConfig = useMemo(
    () => [
      { key: "users", label: "Usuários", icon: Users, component: <MasterUsersManager /> },
      { key: "permissions", label: "Permissões", icon: ShieldCheck, component: <MasterPermissionsManager /> },
      { key: "empresa", label: "Empresa", icon: Building2, component: <MasterEmpresaData /> },
      { key: "logos", label: "Logos", icon: Image, component: <MasterLogoManager /> },
      { key: "database", label: "Banco de Dados", icon: Database, component: <MasterDatabaseManager /> },
      { key: "monitor", label: "Monitoramento", icon: Activity, component: <MasterSystemMonitor /> },
      { key: "settings", label: "Configurações", icon: Settings, component: <MasterGlobalSettings /> },
      { key: "audit", label: "Auditoria", icon: FileText, component: <MasterAuditLogs /> },
      { key: "security", label: "Segurança", icon: Lock, component: <MasterSecurity /> },
    ] as const,
    []
  );

  // Proteção de acesso: se o usuário não for MASTER TI, exibe mensagem de acesso negado
  if (!isMasterTI) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          {/* Ícone de erro */}
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ServerCrash className="h-8 w-8 text-destructive" />
          </div>

          {/* Mensagem de acesso negado */}
          <h2 className="text-xl font-bold text-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground max-w-md">
            Este painel é exclusivo para usuários com perfil <strong>MASTER TI</strong>.  
            Verifique suas permissões ou contate o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  // Renderização do painel MasterTI
  return (
    <div className="space-y-6">
      {/* Header do painel */}
      <div className="flex items-center gap-4">
        {/* Ícone do painel */}
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>

        {/* Título e descrição */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Master TI</h1>
          <p className="text-muted-foreground">
            Gerenciamento total e estratégico do sistema
          </p>
        </div>
      </div>

      {/* Tabs do painel */}
      <Tabs
        value={activeTab} // Aba ativa
        onValueChange={(value) => setActiveTab(value as TabKey)} // Muda a aba ao clicar
        className="space-y-6"
      >
        {/* Lista de abas */}
        <TabsList className="bg-card border border-border h-auto flex-wrap gap-1 p-1">
          {tabsConfig.map(({ key, label, icon: Icon }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {/* Ícone da aba */}
              <Icon className="h-4 w-4" />
              {/* Label da aba */}
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Conteúdo de cada aba */}
        {tabsConfig.map(({ key, component }) => (
          <TabsContent key={key} value={key}>
            {component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
