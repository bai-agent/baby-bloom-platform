"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Home,
  User,
  ShieldCheck,
  Calendar,
  Briefcase,
  Settings,
  Search,
  ClipboardList,
  Baby,
  Filter,
  Users,
  BarChart3,
  LogOut,
  PlusCircle,
  LucideIcon,
  HelpCircle,
  Eye,
  LayoutDashboard,
  MessageSquare,
  LogIn,
  UserPlus,
} from "lucide-react";

type UserRole = "nanny" | "parent" | "admin" | "super_admin" | "guest";

interface MobileNavProps {
  role: UserRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const nannyNavItems: NavItem[] = [
  { href: "/nanny/dashboard", icon: Home, label: "Dashboard" },
  { href: "/nanny/profile", icon: User, label: "My Profile" },
  { href: "/nanny/team", icon: Users, label: "Our Team" },
  { href: "/nanny/verification", icon: ShieldCheck, label: "Verification" },
  { href: "/nanny/interviews", icon: Calendar, label: "Interview Requests" },
  { href: "/nanny/babysitting", icon: Briefcase, label: "Babysitting Jobs" },
  { href: "/nanny/settings", icon: Settings, label: "Settings" },
];

const parentNavItems: NavItem[] = [
  { href: "/parent/dashboard", icon: Home, label: "Dashboard" },
  { href: "/parent/browse", icon: Search, label: "Browse Nannies" },
  { href: "/parent/position", icon: ClipboardList, label: "My Position" },
  { href: "/parent/request", icon: PlusCircle, label: "Nanny Request" },
  { href: "/parent/interviews", icon: Calendar, label: "Interviews" },
  { href: "/parent/babysitting", icon: Baby, label: "Babysitting" },
  { href: "/parent/settings", icon: Settings, label: "Settings" },
];

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", icon: Home, label: "Dashboard" },
  { href: "/admin/pipeline", icon: Filter, label: "User Pipeline" },
  { href: "/admin/verifications", icon: ShieldCheck, label: "Verifications" },
  { href: "/admin/users", icon: Users, label: "User Management" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

const guestPublicItems: NavItem[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/nannies", icon: Search, label: "Browse Nannies" },
  { href: "/about", icon: HelpCircle, label: "About" },
  { href: "/how-it-works", icon: Eye, label: "How It Works" },
];

const guestProtectedItems: NavItem[] = [
  { href: "/signup", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/signup", icon: MessageSquare, label: "Interviews" },
  { href: "/signup", icon: Baby, label: "Babysitting" },
  { href: "/signup", icon: ClipboardList, label: "My Position" },
  { href: "/signup", icon: Settings, label: "Settings" },
];

const navItemsByRole: Record<UserRole, NavItem[]> = {
  nanny: nannyNavItems,
  parent: parentNavItems,
  admin: adminNavItems,
  super_admin: adminNavItems,
  guest: guestPublicItems,
};

export function MobileNav({ role, open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const isGuest = role === "guest";
  const { profile, signOut } = useAuth();
  const navItems = navItemsByRole[role] || [];

  const fullName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : "";
  const firstName = profile?.first_name || "User";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-left">
            <Link href="/" className="flex items-center gap-0.5 text-xl font-bold">
              <span className="text-slate-900">Baby</span>
              <span className="text-violet-500">Bloom</span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-violet-500 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}

          {isGuest && (
            <>
              <div className="my-3 border-t border-slate-200" />
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Sign up to access
              </p>
              {guestProtectedItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {isGuest ? (
          <div className="border-t p-4 space-y-2">
            <Button asChild variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Log in
              </Link>
            </Button>
            <Button asChild className="w-full bg-violet-500 hover:bg-violet-600" onClick={() => onOpenChange(false)}>
              <Link href="/signup">
                <UserPlus className="mr-2 h-4 w-4" />
                Sign Up
              </Link>
            </Button>
          </div>
        ) : (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={fullName || firstName}
                imageUrl={profile?.profile_picture_url || undefined}
              />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-slate-900">
                  {firstName}
                </p>
                <p className="truncate text-xs text-slate-500 capitalize">{role}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
