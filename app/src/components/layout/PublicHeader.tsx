"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublicHeaderProps {
  onMenuClick?: () => void;
}

export function PublicHeader({ onMenuClick }: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Mobile logo */}
      <Link href="/" className="flex items-center gap-0.5 text-xl font-bold lg:hidden">
        <span className="text-slate-900">Baby</span>
        <span className="text-violet-500">Bloom</span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Auth buttons */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild className="hidden sm:inline-flex">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild className="bg-violet-500 hover:bg-violet-600">
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
    </header>
  );
}
