import { useState, useMemo, useEffect } from "react";
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
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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

// ======================
// MasterUsersManager corrigido
// ======================
type UserType = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function MasterUsersManager() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/users", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`Erro ao buscar usuários: ${res.statusText}`);
        }

        const data = await res.json();
        setUsers(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erro desconhecido ao carregar usuários");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  if (!users.length) {
    return <p className="text-muted-foreground">Nenhum usuário encontrado.</p>;
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex justify-between items-center p-3 border rounded hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {user.role}
          </span>
        </div>
      ))}
    </div>
  );
}

// ======================
// MasterTI principal
// ======================
export default function MasterTI() {
  const auth = useAuth();
  const isMasterTI = Boolean(auth?.isMasterTI);
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  // Configuração das abas
  const tabsConfig = useMemo(
    () => [
      { key: "users", label: "Usuários", icon: Users, component: <MasterUsersManager /> },
      { key: "permissions", label: "Permissões", icon: ShieldCheck, component: <p>Permissões em construção</p> },
      { key: "empresa", label: "Empresa", icon: Building2, component: <p>Dados da empresa em construção</p> },
      { key: "logos", label: "Logos", icon: Image, component: <p>Gerenciamento de logos em construção</p> },
      { key: "database", label: "Banco de Dados", icon: Database, component: <p>Banco de dados em construção</p> },
      { key: "monitor", label: "Monitoramento", icon: Activity, component: <p>Monitoramento em construção</p> },
      { key: "settings", label: "Configurações", icon: Settings, component: <p>Configurações em construção</p> },
      { key: "audit", label: "Auditoria", icon: FileText, component: <p>Auditoria em construção</p> },
      { key: "security", label: "Segurança", icon: Lock, component: <p>Segurança em construção</p> },
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

          <h2 className="text-xl font-bold text-foreground">
            Acesso Negado
          </h2>

          <p className="text-muted-foreground max-w-md">
            Este painel é exclusivo para usuários com perfil{" "}
            <strong>MASTER TI</strong>.  
            Verifique suas permissões ou contate o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Painel Master TI
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento total e estratégico do sistema
          </p>
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
