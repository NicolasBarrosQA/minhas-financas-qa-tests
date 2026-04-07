import { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { AzinhaChat } from "@/components/AzinhaChat";

interface MainLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function MainLayout({ children, hideNav = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className={hideNav ? "" : "pb-24"}>
        {children}
      </main>
      {!hideNav && (
        <>
          <AzinhaChat />
          <BottomNav />
        </>
      )}
    </div>
  );
}
