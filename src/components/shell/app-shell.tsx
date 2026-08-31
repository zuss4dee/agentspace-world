"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorldProvider } from "@/components/world/world-store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const habitat = pathname === "/" || pathname === "/plaza" || pathname === "/directory";
  return (
    <WorldProvider>
      <TooltipProvider>
        {habitat ? (
          pathname === "/directory" ? (
            <div className="flex min-h-dvh flex-col overflow-auto bg-[#0a0a0a]">{children}</div>
          ) : (
            <div className="flex h-dvh flex-col overflow-hidden bg-[#0a0a0a]">{children}</div>
          )
        ) : (
          <div className="flex min-h-dvh flex-col bg-[#0a0a0a] text-white">
            <header className="ns-site-bar sticky top-0 z-20">
              <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
                <Link href="/" className="text-sm tracking-wide">
                  ← Campus
                </Link>
                <nav className="flex flex-wrap items-center gap-3 text-sm">
                  <Link href="/how">How to join</Link>
                  <Link href="/marketplace">Props</Link>
                  <Link href="/studio">Studio</Link>
                  <Link href="/connect">Connect</Link>
                  <Link href="/gift">Gift</Link>
                  <Link href="/vision">Vision</Link>
                </nav>
              </div>
            </header>
            <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          </div>
        )}
        <Toaster />
      </TooltipProvider>
    </WorldProvider>
  );
}
