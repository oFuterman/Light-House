"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { Loading } from "@/components/ui/Loading";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
    }
  }, [isAuthLoading, user, router]);

  // Show loading state while verifying auth with backend
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading message="Verifying session..." />
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
