"use client";

import { cn } from "@/lib/utils";

interface DashboardPageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardPageShell({
  title,
  subtitle,
  children,
  className,
}: DashboardPageShellProps) {
  return (
    <div className={cn("p-6 flex flex-col gap-6 animate-fade-in", className)}>
      <div>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
