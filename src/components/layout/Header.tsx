import Link from "next/link";
import { Container } from "./Container";
import { Baby } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-bb-purple-100 bg-white/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-bb-purple-500 to-bb-pink-500">
            <Baby className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold bb-gradient-text">
            Baby Bloom
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/demos"
            className="text-sm font-medium text-[var(--bb-text-muted)] transition-colors hover:text-bb-purple-600"
          >
            Component Demos
          </Link>
        </nav>
      </Container>
    </header>
  );
}
