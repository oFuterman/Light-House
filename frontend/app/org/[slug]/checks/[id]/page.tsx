import { notFound } from "next/navigation";
import { getServerCheck, getServerCheckResults } from "@/lib/auth-server";
import { CheckDetailContent } from "@/components/CheckDetailContent";

interface CheckDetailPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function CheckDetailPage({ params }: CheckDetailPageProps) {
  const { id } = await params;

  // Pre-fetch check and results on the server
  const [check, results] = await Promise.all([
    getServerCheck(id),
    getServerCheckResults(id, 24),
  ]);

  if (!check) {
    notFound();
  }

  return <CheckDetailContent check={check} initialResults={results} />;
}
