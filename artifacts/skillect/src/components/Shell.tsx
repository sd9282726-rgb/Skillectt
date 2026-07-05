import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  Compass,
  Users,
  PlusSquare,
  MessageCircle,
  User as UserIcon,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

const NAV_ITEMS = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/communities", label: "Communities", icon: Users },
  { href: "/create", label: "Create", icon: PlusSquare },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export default function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { profile } = useApp();

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-border shrink-0 sticky top-0 h-[100dvh]">
        <div className="px-6 py-6 flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Skillect" className="h-9 w-9" />
          <span className="text-xl font-bold neon-text tracking-tight">Skillect</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? location === "/" : location.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover-elevate ${
                  active
                    ? "bg-[var(--primary-dim)] text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {profile && (
          <Link
            href="/profile"
            className="mx-3 mb-6 flex items-center gap-3 rounded-xl border border-border p-3 hover-elevate"
          >
            <img
              src={profile.avatar}
              alt={profile.name}
              className="h-10 w-10 rounded-full object-cover border border-border"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{profile.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                @{profile.username}
              </p>
            </div>
          </Link>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Skillect" className="h-7 w-7" />
          <span className="text-lg font-bold neon-text">Skillect</span>
        </header>

        <main className="flex-1 w-full pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-border bg-background/95 backdrop-blur flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? location === "/" : location.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
