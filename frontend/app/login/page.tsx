import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  // Redirect to dashboard if already logged in
  if (await isAuthenticated()) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <LoginForm />
    </main>
  );
}
