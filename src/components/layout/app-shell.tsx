"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav, MobileTabBar } from "./mobile-nav";

interface AppShellProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    permissions: string[];
  };
  shopName?: string | null;
  children: React.ReactNode;
}

/**
 * Client shell around server-rendered pages. Only the navigation state lives
 * here; the identity is resolved on the server and passed in, so nothing
 * renders before the session is known.
 */
export function AppShell({ user, shopName, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar permissions={user.permissions} />

      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        permissions={user.permissions}
      />

      <div className="lg:pl-[260px] flex min-h-screen flex-col">
        <Header
          user={user}
          shopName={shopName}
          onMenuClick={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6 xl:p-8">
          {children}
        </main>
      </div>

      <MobileTabBar permissions={user.permissions} />
    </div>
  );
}
