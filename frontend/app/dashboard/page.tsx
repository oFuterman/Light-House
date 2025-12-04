import { getServerChecks } from "@/lib/auth-server";
import { DashboardContent } from "@/components/DashboardContent";

export default async function DashboardPage() {
  // Pre-fetch checks on the server - no loading spinner needed
  const checks = await getServerChecks();

  return <DashboardContent initialChecks={checks} />;
}
