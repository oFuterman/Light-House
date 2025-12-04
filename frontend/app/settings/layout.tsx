import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import { DashboardNav } from "@/components/DashboardNav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      {children}
    </div>
  );
}
