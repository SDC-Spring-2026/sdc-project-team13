import { cn } from "../../lib/utils";

export function StreamingBar({
  active,
  label,
  className
}: {
  active: boolean;
  label?: string;
  className?: string;
}) {
  if (!active) return null;
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
      ) : null}
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 w-2/3 animate-[stream_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary/20 via-primary/70 to-primary/20" />
      </div>
    </div>
  );
}
