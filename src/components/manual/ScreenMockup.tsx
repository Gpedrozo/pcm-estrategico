interface ScreenMockupProps {
  title: string;
  children: React.ReactNode;
}

export function ScreenMockup({ title, children }: ScreenMockupProps) {
  return (
    <div className="manual-screen-frame print-avoid-break">
      <div className="manual-screen-topbar">
        <div className="flex items-center gap-1.5">
          <span className="manual-screen-dot bg-red-400" />
          <span className="manual-screen-dot bg-yellow-400" />
          <span className="manual-screen-dot bg-green-400" />
        </div>
        <span className="text-xs text-muted-foreground ml-3 truncate">{title}</span>
      </div>
      <div className="p-0 bg-background">{children}</div>
    </div>
  );
}

export function MockSidebar({
  activeItem,
  items,
}: {
  activeItem: string;
  items: string[];
}) {
  return (
    <div className="w-40 border-r border-border bg-muted/30 p-2 space-y-1 flex-shrink-0">
      <div className="text-[10px] font-bold text-primary mb-2 px-2">PCM</div>
      {items.map((item) => (
        <div
          key={item}
          className={`text-xs px-2 py-1.5 rounded cursor-default ${
            item === activeItem
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

export function MockFormField({
  label,
  type = "text",
  value = "",
  required,
}: {
  label: string;
  type?: "text" | "select" | "textarea";
  value?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {type === "textarea" ? (
        <div className="w-full rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground min-h-[60px]">
          {value}
        </div>
      ) : type === "select" ? (
        <div className="w-full rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>{value || "Selecionar..."}</span>
          <span className="text-xs">▼</span>
        </div>
      ) : (
        <div className="w-full rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {value}
        </div>
      )}
    </div>
  );
}

export function MockButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "success" | "danger";
}) {
  const classes: Record<string, string> = {
    primary: "bg-primary text-primary-foreground",
    outline: "border border-border text-foreground bg-background",
    success: "bg-green-600 text-white",
    danger: "bg-destructive text-destructive-foreground",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium cursor-default ${classes[variant]}`}
    >
      {children}
    </span>
  );
}

export function MockTable({
  headers,
  rows,
  highlightRow,
}: {
  headers: string[];
  rows: string[][];
  highlightRow?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {headers.map((h) => (
              <th key={h} className="text-left py-2 px-2 font-semibold text-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={`border-b border-border/50 ${
                ri === highlightRow ? "bg-primary/5" : ""
              }`}
            >
              {row.map((cell, ci) => (
                <td key={ci} className="py-2 px-2 text-muted-foreground whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MockStatusBadge({
  status,
}: {
  status: "aberta" | "em_execucao" | "fechada" | "pendente" | "critica" | "normal";
}) {
  const classes: Record<string, string> = {
    aberta: "manual-badge-aberta",
    em_execucao: "manual-badge-execucao",
    fechada: "manual-badge-fechada",
    pendente: "manual-badge-pendente",
    critica: "manual-badge-critica",
    normal: "manual-badge-normal",
  };

  const labels: Record<string, string> = {
    aberta: "Aberta",
    em_execucao: "Em Execução",
    fechada: "Fechada",
    pendente: "Pendente",
    critica: "Crítica",
    normal: "Normal",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}
