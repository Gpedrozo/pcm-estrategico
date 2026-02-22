import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MasterUsersManager } from "@/components/master-ti/MasterUsersManager";
import { MasterDatabaseManager } from "@/components/master-ti/MasterDatabaseManager";
import { MasterSystemMonitor } from "@/components/master-ti/MasterSystemMonitor";
import { MasterGlobalSettings } from "@/components/master-ti/MasterGlobalSettings";
import { MasterAuditLogs } from "@/components/master-ti/MasterAuditLogs";
import { MasterSecurity } from "@/components/master-ti/MasterSecurity";
import { MasterEmpresaData } from "@/components/master-ti/MasterEmpresaData";
import { MasterLogoManager } from "@/components/master-ti/MasterLogoManager";
import { MasterPermissionsManager } from "@/components/master-ti/MasterPermissionsManager";

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

export default function MasterTI() {
  const auth = useAuth();
  const isMasterTI = Boolean(auth?.isMasterTI);
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  // Configuração centralizada das abas
  const tabsConfig = useMemo(
    () =>
      [
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

  // Proteção de acesso
  if (!isMasterTI) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ServerCrash className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground max-w-md">
            Este painel é exclusivo para usuários com perfil <strong>MASTER TI</strong>.
            Verifique suas permissões ou contate o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  // Render principal
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Master TI</h1>
          <p className="text-muted-foreground">Gerenciamento total e estratégico do sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabKey)}
        className="space-y-6"
      >
        <TabsList className="bg-card border border-border h-auto flex-wrap gap-1 p-1">
          {tabsConfig.map(({ key, label, icon: Icon }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabsConfig.map(({ key, component }) => (
          <TabsContent key={key} value={key}>
            {component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
