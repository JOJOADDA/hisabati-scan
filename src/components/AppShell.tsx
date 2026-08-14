import { Link, useRouterState } from "@tanstack/react-router";
import { Camera, Clock, Settings } from "lucide-react";
import type { ReactNode } from "react";
import logo from "@/assets/hisabati-logo.png.asset.json";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Scanner", icon: Camera },
  { to: "/recent", label: "Recent", icon: Clock },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center gap-3 px-4">
          <img src={logo.url} alt="Hisabati" className="h-8 w-8 rounded-lg object-cover" />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Hisabati Scanner</p>
            {title ? <p className="text-[11px] text-muted-foreground">{title}</p> : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav
        className="app-chrome fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-card/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto flex w-full max-w-xl items-stretch">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
