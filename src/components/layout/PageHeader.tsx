"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: { label: string; href?: string }[];
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("border-b bg-muted/20 px-4 py-4 sm:py-6", className)}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          {breadcrumb && breadcrumb.length > 0 && (
            <nav className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
              {breadcrumb.map((item, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="size-3" />}
                  {item.href ? (
                    <Link href={item.href} className="hover:text-foreground">
                      {item.label}
                    </Link>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-lg font-bold tracking-tight sm:text-2xl">{title}</h1>
          {description && (
            <p className="max-w-xl text-xs text-muted-foreground sm:text-sm">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  variant?: "default" | "urgent" | "success" | "info";
  active?: boolean;
  onClick?: () => void;
}

const VARIANTS = {
  default: "border-border",
  urgent: "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
  success: "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
  info: "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20",
};

const VALUE_VARIANTS = {
  default: "text-foreground",
  urgent: "text-red-600",
  success: "text-green-600",
  info: "text-blue-600",
};

export function StatCard({
  label,
  value,
  hint,
  variant = "default",
  active = false,
  onClick,
}: StatCardProps) {
  const interactive = Boolean(onClick);
  const Comp = interactive ? "button" : "div";

  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all",
        VARIANTS[variant],
        interactive &&
          "cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        active && "ring-2 ring-primary shadow-md"
      )}
    >
      <p className={cn("text-2xl font-bold tabular-nums", VALUE_VARIANTS[variant])}>
        {value}
      </p>
      <p className="mt-1 text-sm font-medium">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      {interactive && !hint && (
        <p className="mt-1 text-[10px] text-muted-foreground">Clic para filtrar</p>
      )}
    </Comp>
  );
}
