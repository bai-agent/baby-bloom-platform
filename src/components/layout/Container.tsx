import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

const Container = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  ),
);

Container.displayName = "Container";
export { Container };
