import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "gradient";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-bb-purple-600 text-white hover:bg-bb-purple-700 active:bg-bb-purple-800 shadow-sm",
  secondary:
    "bg-bb-purple-100 text-bb-purple-700 hover:bg-bb-purple-200 active:bg-bb-purple-300",
  outline:
    "border border-bb-purple-300 text-bb-purple-700 hover:bg-bb-purple-50 active:bg-bb-purple-100",
  ghost:
    "text-bb-purple-600 hover:bg-bb-purple-50 active:bg-bb-purple-100",
  gradient:
    "bg-gradient-to-r from-bb-purple-500 to-bb-pink-500 text-white hover:from-bb-purple-600 hover:to-bb-pink-600 shadow-sm",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm rounded-md gap-1.5",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-12 px-6 text-base rounded-lg gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-purple-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={disabled}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
