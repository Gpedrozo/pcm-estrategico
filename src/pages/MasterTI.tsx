import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, Database, Activity, Settings, FileText, Lock, ServerCrash, Building2, Image, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MasterUsersManager } from '@/components/master-ti/MasterUsersManager';
import { MasterDatabaseManager } from '@/components/master-ti/MasterDatabaseManager';
import { MasterSystemMonitor } from '@/components/master-ti/MasterSystemMonitor';
import { MasterGlobalSettings } from '@/components/master-ti/MasterGlobalSettings';
import { MasterAuditLogs } from '@/components/master-ti/MasterAuditLogs';
import { MasterSecurity } from '@/components/master-ti/MasterSecurity';
import { MasterEmpresaData } from '@/components/master-ti/MasterEmpresaData';
import { MasterLogoManager } from '@/components/master-ti/MasterLogoManager';
import { MasterPermissionsManager } from '@/components/master-ti/MasterPermissionsManager';

export default function MasterTI() {
  const { isMasterTI } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

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
            Contate o administrador do sistema.
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
          <h1 className="text-2xl font-bold text-foreground">Painel Master TI</h1>
          <p className="text-muted-foreground">Gerenciamento total do sistema</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="h-4 w-4" /> Permissões
          </TabsTrigger>
          <TabsTrigger value="empresa" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-4 w-4" /> Empresa
          </TabsTrigger>
          <TabsTrigger value="logos" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Image className="h-4 w-4" /> Logos
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Database className="h-4 w-4" /> Banco de Dados
          </TabsTrigger>
          <TabsTrigger value="monitor" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Activity className="h-4 w-4" /> Monitoramento
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-4 w-4" /> Configurações
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="h-4 w-4" /> Auditoria
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Lock className="h-4 w-4" /> Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users"><MasterUsersManager /></TabsContent>
        <TabsContent value="permissions"><MasterPermissionsManager /></TabsContent>
        <TabsContent value="empresa"><MasterEmpresaData /></TabsContent>
        <TabsContent value="logos"><MasterLogoManager /></TabsContent>
        <TabsContent value="database"><MasterDatabaseManager /></TabsContent>
        <TabsContent value="monitor"><MasterSystemMonitor /></TabsContent>
        <TabsContent value="settings"><MasterGlobalSettings /></TabsContent>
        <TabsContent value="audit"><MasterAuditLogs /></TabsContent>
        <TabsContent value="security"><MasterSecurity /></TabsContent>
      </Tabs>
    </div>
  );
}
