import { cn } from "@/lib/utils";

interface SuccessBadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "info";
  className?: string;
}

export function SuccessBadge({ children, variant = "success", className }: SuccessBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          "bg-success/10 text-success": variant === "success",
          "bg-warning/10 text-warning": variant === "warning",
          "bg-destructive/10 text-destructive": variant === "error",
          "bg-primary/10 text-primary": variant === "info",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
