"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-72">
        <Header />
        <div id="dashboard-main" className="px-8 pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
