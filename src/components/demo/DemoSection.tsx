import { cn } from "@/lib/utils";

interface DemoSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function DemoSection({ title, description, children, className }: DemoSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-xl font-semibold text-bb-purple-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-[var(--bb-text-muted)]">{description}</p>
        )}
      </div>
      <div className="rounded-xl border border-bb-purple-100 bg-white p-6">
        {children}
      </div>
    </section>
  );
}
