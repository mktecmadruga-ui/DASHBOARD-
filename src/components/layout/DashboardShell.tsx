"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Skip-to-content link for keyboard users */}
      <a href="#dashboard-main" className="skip-link">Pular para o conteúdo</a>

      <Sidebar />
      <div className="flex-1 ml-72 flex flex-col min-w-0">
        <Header />
        <main id="dashboard-main" tabIndex={-1} className="flex-1 px-6 lg:px-8 pb-10 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
