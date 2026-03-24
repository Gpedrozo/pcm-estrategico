import { useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { BookOpen, ChevronLeft, ChevronRight, Printer } from "lucide-react";

const chapters = [
  { num: "01", label: "Login e Primeiro Acesso", slug: "login" },
  { num: "02", label: "Perfis e Permissões", slug: "perfis" },
  { num: "03", label: "Solicitações", slug: "solicitacoes" },
  { num: "04", label: "Backlog", slug: "backlog" },
  { num: "05", label: "Emitir O.S", slug: "emitir-os" },
  { num: "06", label: "Fechar O.S", slug: "fechar-os" },
  { num: "07", label: "Histórico", slug: "historico" },
  { num: "08", label: "Programação", slug: "programacao" },
  { num: "09", label: "Preventiva", slug: "preventiva" },
  { num: "10", label: "Preditiva", slug: "preditiva" },
  { num: "11", label: "Lubrificação", slug: "lubrificacao" },
  { num: "12", label: "Inspeções", slug: "inspecoes" },
  { num: "13", label: "FMEA / RCM", slug: "fmea-rcm" },
  { num: "14", label: "RCA", slug: "rca" },
  { num: "15", label: "Inteligência IA", slug: "inteligencia-ia" },
  { num: "16", label: "Melhorias", slug: "melhorias" },
  { num: "17", label: "Cadastros", slug: "cadastros" },
  { num: "18", label: "Custos e Relatórios", slug: "custos-relatorios" },
  { num: "19", label: "SSMA", slug: "ssma" },
  { num: "20", label: "Administração", slug: "administracao" },
  { num: "21", label: "Rotina Operacional", slug: "rotina" },
  { num: "22", label: "KPIs e Métricas", slug: "kpis" },
];

interface ManualLayoutProps {
  basePath?: string;
}

export default function ManualLayout({ basePath = "/manual" }: ManualLayoutProps) {
  const location = useLocation();

  const allPaths = useMemo(() => [basePath, ...chapters.map((c) => `${basePath}/${c.slug}`)], [basePath]);

  const currentIndex = allPaths.indexOf(location.pathname);
  const prevPath = currentIndex > 0 ? allPaths[currentIndex - 1] : null;
  const nextPath = currentIndex < allPaths.length - 1 ? allPaths[currentIndex + 1] : null;

  const currentChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;

  return (
    <div>
      {/* Header compacto */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Manual de Operação</h1>
            {currentChapter && (
              <p className="text-xs text-muted-foreground">
                Cap. {currentChapter.num} — {currentChapter.label}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={basePath}
            className="text-xs text-primary hover:underline"
          >
            Sumário
          </Link>
          <span className="text-muted-foreground text-xs">|</span>
          <Link
            to={`${basePath}/imprimir`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF
          </Link>
        </div>
      </div>

      {/* Conteúdo do capítulo */}
      <Outlet />

      {/* Paginação */}
      <div className="flex items-center justify-between mt-10 pt-5 border-t border-border no-print">
        {prevPath ? (
          <Link
            to={prevPath}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Link>
        ) : (
          <span />
        )}
        {nextPath ? (
          <Link
            to={nextPath}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
