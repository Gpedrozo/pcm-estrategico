import { useState, useMemo, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield, Users, Database, Activity, Settings, FileText,
  Lock, ServerCrash, Building2, Image as ImageIcon, ShieldCheck, Loader2, FileOutput,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Lazy load heavy modules
const MasterUsersManager = lazy(() => import("@/components/master-ti/MasterUsersManager").then(m => ({ default: m.MasterUsersManager })));
const MasterPermissionsManager = lazy(() => import("@/components/master-ti/MasterPermissionsManager").then(m => ({ default: m.MasterPermissionsManager })));
const MasterEmpresaData = lazy(() => import("@/components/master-ti/MasterEmpresaData").then(m => ({ default: m.MasterEmpresaData })));
const MasterLogoManager = lazy(() => import("@/components/master-ti/MasterLogoManager").then(m => ({ default: m.MasterLogoManager })));
const MasterDatabaseManager = lazy(() => import("@/components/master-ti/MasterDatabaseManager").then(m => ({ default: m.MasterDatabaseManager })));
const MasterSystemMonitor = lazy(() => import("@/components/master-ti/MasterSystemMonitor").then(m => ({ default: m.MasterSystemMonitor })));
const MasterGlobalSettings = lazy(() => import("@/components/master-ti/MasterGlobalSettings").then(m => ({ default: m.MasterGlobalSettings })));
const MasterAuditLogs = lazy(() => import("@/components/master-ti/MasterAuditLogs").then(m => ({ default: m.MasterAuditLogs })));
const MasterSecurity = lazy(() => import("@/components/master-ti/MasterSecurity").then(m => ({ default: m.MasterSecurity })));
const MasterDocumentLayouts = lazy(() => import("@/components/master-ti/MasterDocumentLayouts").then(m => ({ default: m.MasterDocumentLayouts })));

type TabKey = "users" | "permissions" | "empresa" | "logos" | "database" | "monitor" | "settings" | "audit" | "security" | "documents";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "users", label: "Usuários", icon: Users },
  { key: "permissions", label: "Permissões", icon: ShieldCheck },
  { key: "empresa", label: "Empresa", icon: Building2 },
  { key: "logos", label: "Logos", icon: ImageIcon },
  { key: "database", label: "Banco de Dados", icon: Database },
  { key: "monitor", label: "Monitoramento", icon: Activity },
  { key: "settings", label: "Configurações", icon: Settings },
  { key: "audit", label: "Auditoria", icon: FileText },
  { key: "security", label: "Segurança", icon: Lock },
  { key: "documents", label: "Documentos", icon: FileOutput },
];

function TabFallback() {
  return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
}

export default function MasterTI() {
  const { isMasterTI } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  if (!isMasterTI) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ServerCrash className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">Acesso Negado</h2>
          <p className="text-muted-foreground max-w-md">
            Este painel é exclusivo para usuários com perfil <strong>MASTER TI</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Painel Master TI</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento total do sistema</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="space-y-6">
        <TabsList className="bg-card border border-border h-auto flex-wrap gap-1 p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Icon size={16} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <Suspense fallback={<TabFallback />}>
          <TabsContent value="users"><MasterUsersManager /></TabsContent>
          <TabsContent value="permissions"><MasterPermissionsManager /></TabsContent>
          <TabsContent value="empresa"><MasterEmpresaData /></TabsContent>
          <TabsContent value="logos"><MasterLogoManager /></TabsContent>
          <TabsContent value="database"><MasterDatabaseManager /></TabsContent>
          <TabsContent value="monitor"><MasterSystemMonitor /></TabsContent>
          <TabsContent value="settings"><MasterGlobalSettings /></TabsContent>
          <TabsContent value="audit"><MasterAuditLogs /></TabsContent>
          <TabsContent value="security"><MasterSecurity /></TabsContent>
          <TabsContent value="documents"><MasterDocumentLayouts /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
