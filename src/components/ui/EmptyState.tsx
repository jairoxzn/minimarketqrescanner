import type { ReactNode } from "react";

export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white py-12 px-6 text-center">
      <span className="text-3xl">{icon}</span>
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-muted max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
