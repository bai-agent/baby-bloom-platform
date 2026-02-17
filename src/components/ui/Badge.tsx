import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "gradient";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-bb-purple-100 text-bb-purple-700",
  secondary: "bg-bb-pink-100 text-bb-pink-700",
  outline: "border border-bb-purple-300 text-bb-purple-600 bg-transparent",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  gradient:
    "bg-gradient-to-r from-bb-purple-500 to-bb-pink-500 text-white",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
          variantStyles[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = "Badge";
export { Badge, type BadgeProps, type BadgeVariant };
