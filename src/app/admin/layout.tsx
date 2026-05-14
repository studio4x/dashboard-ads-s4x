import { AdminSidebar } from "@/components/admin/AdminSidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin — Dashboard ADS S4X" },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC" }}>
      <AdminSidebar />
      <main style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        {children}
      </main>
    </div>
  );
}
