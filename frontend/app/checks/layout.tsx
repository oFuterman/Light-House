import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import { DashboardNav } from "@/components/DashboardNav";

export default async function ChecksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check - redirects before any JS loads
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <DashboardNav />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
