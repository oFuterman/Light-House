"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { NotificationSettingsForm } from "@/components/NotificationSettingsForm";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="mb-6">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
              &larr; Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold mb-6">Organization Settings</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>
            <p className="text-sm text-gray-600 mb-4">
              Configure how you receive alerts when checks go down or recover.
            </p>
            <NotificationSettingsForm />
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
