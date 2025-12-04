import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import { SignupForm } from "@/components/SignupForm";

export default async function SignupPage() {
  // Redirect to dashboard if already logged in
  if (await isAuthenticated()) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <SignupForm />
    </main>
  );
}
