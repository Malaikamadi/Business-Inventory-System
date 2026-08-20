"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav, SaleFAB } from "@/components/layout/mobile-nav";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const userRole = user.role;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar userRole={userRole} />

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        userRole={userRole}
      />

      {/* Main Content */}
      <div className="lg:pl-[260px] flex flex-col min-h-screen">
        <Header
          user={{
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email!,
            role: userRole,
          }}
          onMenuClick={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 xl:p-8">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>

      {/* Salesperson FAB */}
      {userRole === "salesperson" && <SaleFAB />}
    </div>
  );
}
