import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import { DashboardNav } from "@/components/DashboardNav";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  // Server-side auth check
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Get the slug from params
  const { slug } = await params;

  // Validate slug matches user's org
  // Mitigates: F1 (wrong slug), B6 (security check)
  if (user.org_slug && slug !== user.org_slug) {
    redirect(`/org/${user.org_slug}/dashboard`);
  }

  return (
    <div className="min-h-screen">
      <DashboardNav />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
