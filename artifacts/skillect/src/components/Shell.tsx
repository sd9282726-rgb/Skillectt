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
    <div className="min-h-[100dvh] w-full bg-white text-gray-900 flex">
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-gray-200 shrink-0 sticky top-0 h-[100dvh]">
        <div className="px-6 py-6 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="text-xl font-bold tracking-tight text-blue-600">Skillect</span>
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
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
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
            className="mx-3 mb-6 flex items-center gap-3 rounded-xl border border-gray-200 p-3 hover:bg-gray-50"
          >
            <img
              src={
                profile.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`
              }
              alt={profile.display_name}
              className="h-10 w-10 rounded-full object-cover border border-gray-200"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{profile.display_name}</p>
              <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
            </div>
          </Link>
        )}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-2 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            S
          </div>
          <span className="text-lg font-bold text-blue-600">Skillect</span>
        </header>

        <main className="flex-1 w-full pb-20 md:pb-0">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? location === "/" : location.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-blue-600" : "text-gray-500"
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
