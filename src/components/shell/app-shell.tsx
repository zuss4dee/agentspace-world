"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Gift,
  Landmark,
  PlugZap,
  ScrollText,
  Store,
  WandSparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorldProvider } from "@/components/world/world-store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const NAV = [
  { href: "/", label: "Lot", icon: Landmark },
  { href: "/plaza", label: "Plaza", icon: Building2 },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/studio", label: "Studio", icon: WandSparkles },
  { href: "/connect", label: "Connect", icon: PlugZap },
  { href: "/gift", label: "Gift", icon: Gift },
  { href: "/vision", label: "Vision", icon: ScrollText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <WorldProvider>
      <TooltipProvider>
        <div className="flex min-h-dvh flex-col bg-background">
          <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
              <Link href="/" className="flex min-w-0 flex-col">
                <span className="font-heading text-lg leading-none tracking-tight">
                  Grokbot World
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  A lot for your agents. A plaza for everyone else.
                </span>
              </Link>
              <nav className="hidden items-center gap-1 md:flex">
                {NAV.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm",
                        active
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <item.icon />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:hidden">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <item.icon />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        </div>
        <Toaster />
      </TooltipProvider>
    </WorldProvider>
  );
}
