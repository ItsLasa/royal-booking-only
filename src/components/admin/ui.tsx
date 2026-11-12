"use client";

import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { statusColor } from "@/lib/admin/format";

/* ---------- Button ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-[#061b0e] text-white hover:bg-[#0f2e1c] dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white",
    secondary: "bg-surface-container text-on-surface hover:bg-surface-container-high dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
    ghost: "bg-transparent text-on-surface-variant hover:bg-surface-container dark:text-neutral-300 dark:hover:bg-white/10",
    danger: "bg-error text-on-error hover:opacity-90",
    outline: "border border-outline-variant text-on-surface hover:bg-surface-container dark:border-white/20 dark:text-neutral-200 dark:hover:bg-white/10",
  };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-sm" };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

/* ---------- Card ---------- */

export function Card({ className, children, hover }: { className?: string; children: ReactNode; hover?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant/60 bg-white shadow-sm dark:border-white/10 dark:bg-[#12171c]",
        hover && "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-outline-variant/50 px-5 py-4 dark:border-white/10">
      <div>
        <h3 className="font-semibold text-on-surface dark:text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-on-surface-variant dark:text-neutral-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

/* ---------- Badge / StatusBadge ---------- */

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const text = label ?? status.replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", statusColor(status))}>
      {text}
    </span>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-medium text-on-surface-variant dark:bg-white/10 dark:text-neutral-300", className)}>{children}</span>;
}

/* ---------- Form controls ---------- */

export function Field({ label, error, hint, className, children }: { label: string; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-on-surface dark:text-neutral-200">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-on-surface-variant dark:text-neutral-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-error">{error}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-[#061b0e] focus:outline-none focus:ring-2 focus:ring-[#061b0e]/20 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, "appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "min-h-[90px]", className)} {...props} />;
}

/* ---------- Spinner / Skeleton / EmptyState ---------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-5 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-container dark:bg-white/10", className)} />;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-2xl dark:bg-white/10">{icon}</div>}
      <h3 className="text-lg font-semibold text-on-surface dark:text-white">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-on-surface-variant dark:text-neutral-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- PageHeader ---------- */

export function PageHeader({ title, description, actions, breadcrumbs }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumbs?: { label: string; href?: string }[] }) {
  return (
    <div className="mb-6">
      {breadcrumbs && (
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-on-surface-variant dark:text-neutral-500" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-on-surface-variant/40">/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="transition-colors hover:text-on-surface dark:hover:text-white">
                  {crumb.label}
                </a>
              ) : (
                <span className="font-medium text-on-surface dark:text-white">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface dark:text-white">{title}</h1>
          {description && <p className="mt-1 text-sm text-on-surface-variant dark:text-neutral-400">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ---------- StatCard ---------- */

export function StatCard({ label, value, sub, tone = "default" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  const tones = {
    default: "text-on-surface dark:text-white",
    success: "text-emerald-700 dark:text-emerald-400",
    warning: "text-amber-700 dark:text-amber-400",
    danger: "text-rose-700 dark:text-rose-400",
  };
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-neutral-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold", tones[tone])}>{value}</p>
      {sub && <p className="mt-1 text-xs text-on-surface-variant dark:text-neutral-500">{sub}</p>}
    </Card>
  );
}

/* ---------- Tabs ---------- */

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: ReactNode }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-surface-container/70 p-1 dark:bg-white/5" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-all",
            active === tab.id ? "bg-white text-on-surface shadow-sm dark:bg-white/15 dark:text-white" : "text-on-surface-variant hover:text-on-surface dark:text-neutral-400 dark:hover:text-white",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Pagination ---------- */

export function Pagination({ page, pages, total, onChange }: { page: number; pages: number; total: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <p className="text-xs text-on-surface-variant dark:text-neutral-500">{total} record{total === 1 ? "" : "s"}</p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <span className="px-2 text-sm text-on-surface-variant dark:text-neutral-400">
          {page} / {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
