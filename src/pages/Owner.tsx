import { AlertTriangle, Building2, CreditCard, Database, FileSearch, Fingerprint, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const dashboardMetrics = [
  { title: "Total de empresas", value: "—" },
  { title: "Empresas ativas", value: "—" },
  { title: "Empresas suspensas", value: "—" },
  { title: "Total de usuários", value: "—" },
  { title: "MRR", value: "—" },
  { title: "Receita anual estimada", value: "—" },
  { title: "Crescimento mensal", value: "—" },
  { title: "Empresas em trial", value: "—" },
  { title: "Inadimplentes", value: "—" },
];

const modules = [
  { key: "empresas", label: "Empresas", icon: Building2, description: "Gestão global de empresas com suspensão, reativação e soft delete." },
  { key: "planos", label: "Planos", icon: Fingerprint, description: "CRUD de planos e feature flags com limites de usuários, OS e storage." },
  { key: "assinaturas", label: "Assinaturas", icon: CreditCard, description: "Assinaturas globais, status financeiro e bloqueio de acesso por inadimplência." },
  { key: "auditoria", label: "Auditoria Global", icon: FileSearch, description: "Logs globais de ações críticas, promoções indevidas e acessos cruzados." },
  { key: "monitoramento", label: "Monitoramento", icon: Database, description: "Integridade do sistema, uso técnico e eventos de rate limit." },
];

export default function Owner() {
  const { isSystemOwner } = useAuth();

  if (!isSystemOwner) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md border-destructive/40">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Este portal global é exclusivo para o perfil SYSTEM_OWNER.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-amber-500 text-black hover:bg-amber-500">SYSTEM OWNER</Badge>
          <span className="text-sm font-semibold">AMBIENTE GLOBAL</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500" />
          Operações neste portal impactam todas as empresas. Ações críticas devem ser auditadas e revisadas.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {dashboardMetrics.map((metric) => (
          <Card key={metric.title} className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardDescription>{metric.title}</CardDescription>
              <CardTitle className="text-2xl">{metric.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Tabs defaultValue="empresas" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          {modules.map((module) => (
            <TabsTrigger key={module.key} value={module.key} className="gap-2">
              <module.icon className="h-4 w-4" />
              {module.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {modules.map((module) => (
          <TabsContent key={module.key} value={module.key}>
            <Card className="border-amber-500/20">
              <CardHeader>
                <CardTitle>{module.label}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Módulo preparado para consultas paginadas (máx. 100 registros por página), trilha de auditoria e políticas exclusivas de SYSTEM_OWNER.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
