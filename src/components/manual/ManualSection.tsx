import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle, Lightbulb, Info } from "lucide-react";

interface ManualSectionProps {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}

export function ManualSection({ id, number, title, children }: ManualSectionProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="manual-section-title">
        <span className="manual-step-number w-10 h-10 text-base">{number}</span>
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

export function StepList({ steps }: { steps: string[] }) {
  return (
    <div className="manual-card space-y-3 print-avoid-break">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-primary" />
        Passo a Passo
      </h3>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="manual-step-number w-6 h-6 text-xs flex-shrink-0">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Checklist({ items }: { items: string[] }) {
  return (
    <div className="manual-card space-y-3 print-avoid-break">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-600" />
        Checklist de Validação
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const highlightIcons = {
  info: Info,
  warning: AlertTriangle,
  tip: Lightbulb,
};

export function HighlightBox({
  variant = "info",
  title,
  children,
}: {
  variant?: "info" | "warning" | "tip";
  title?: string;
  children: React.ReactNode;
}) {
  const Icon = highlightIcons[variant];
  const boxClass = variant === "warning" ? "manual-warning-box" : "manual-highlight-box";

  return (
    <div className={`${boxClass} print-avoid-break`} data-variant={variant}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          {title && <p className="font-semibold">{title}</p>}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ObjectiveBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 print-avoid-break">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary-foreground">OBJ</span>
        </div>
        <div className="text-sm text-foreground font-medium">{children}</div>
      </div>
    </div>
  );
}

interface FieldTableProps {
  fields: { name: string; description: string; required?: boolean }[];
}

export function FieldTable({ fields }: FieldTableProps) {
  return (
    <div className="manual-card overflow-x-auto print-avoid-break">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 font-semibold text-foreground">Campo</th>
            <th className="text-left py-2 px-3 font-semibold text-foreground">Descrição</th>
            <th className="text-center py-2 px-3 font-semibold text-foreground">Obrigatório</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.name} className="border-b border-border/50">
              <td className="py-2 px-3 font-medium text-foreground">{f.name}</td>
              <td className="py-2 px-3 text-muted-foreground">{f.description}</td>
              <td className="py-2 px-3 text-center">
                {f.required ? (
                  <span className="text-primary font-bold">✓</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
