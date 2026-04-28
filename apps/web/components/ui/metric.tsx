import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Metric({
  label,
  value,
  className
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-muted/15 p-3 transition-colors hover:bg-muted/25",
        className
      )}
    >
      <div className="text-[11px] font-medium tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold leading-none">{value}</div>
    </div>
  );
}
