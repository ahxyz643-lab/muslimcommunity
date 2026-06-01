import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export const StatCard = ({ label, value, hint, icon: Icon, accent }: { label: string; value: ReactNode; hint?: string; icon?: any; accent?: string }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {Icon && <Icon className={`h-4 w-4 ${accent || "text-primary"}`} />}
    </div>
    <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

export const Section = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <section className="rounded-2xl border border-border bg-card">
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {action}
    </div>
    <div className="p-3">{children}</div>
  </section>
);

export const Empty = ({ children }: { children: ReactNode }) => (
  <div className="py-10 text-center text-xs text-muted-foreground">{children}</div>
);

export const Spinner = () => <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

export const Pill = ({ tone = "muted", children }: { tone?: "muted" | "ok" | "warn" | "bad" | "info"; children: ReactNode }) => {
  const map: Record<string,string> = {
    muted: "bg-secondary text-muted-foreground",
    ok: "bg-primary/15 text-primary",
    warn: "bg-accent/20 text-accent",
    bad: "bg-destructive/20 text-destructive",
    info: "bg-blue-500/20 text-blue-500",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[tone]}`}>{children}</span>;
};

export const Btn = ({ variant = "secondary", children, ...rest }: any) => {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50";
  const map: Record<string,string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-secondary text-foreground hover:bg-secondary/70",
    danger: "bg-destructive/15 text-destructive hover:bg-destructive/25",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-secondary",
    accent: "bg-accent/20 text-accent hover:bg-accent/30",
  };
  return <button className={`${base} ${map[variant]}`} {...rest}>{children}</button>;
};

export const MiniBars = ({ data, height = 60 }: { data: number[]; height?: number }) => {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/40 to-primary" style={{ height: `${(v/max)*100}%`, minHeight: 2 }} />
      ))}
    </div>
  );
};
