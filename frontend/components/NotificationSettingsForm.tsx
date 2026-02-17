"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth";

export function NotificationSettingsForm() {
  const { canManageSettings } = useAuth();
  const [emails, setEmails] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await api.getNotificationSettings();
      setEmails(settings.email_recipients?.join(", ") || "");
      setWebhookUrl(settings.webhook_url || "");
    } catch (err) {
      console.error("Failed to load notification settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const emailList = emails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
      await api.updateNotificationSettings({
        email_recipients: emailList,
        webhook_url: webhookUrl.trim() || null,
      });
      setMessage({ type: "success", text: "Settings saved successfully" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save settings";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}
      <div>
        <label htmlFor="emails" className="block text-sm font-medium mb-1">
          Email Recipients
        </label>
        <input
          id="emails"
          type="text"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          disabled={!canManageSettings}
          placeholder="alerts@example.com, team@example.com"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Comma-separated list of email addresses</p>
      </div>
      <div>
        <label htmlFor="webhook" className="block text-sm font-medium mb-1">
          Webhook URL
        </label>
        <input
          id="webhook"
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          disabled={!canManageSettings}
          placeholder="https://hooks.slack.com/services/..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Receives POST with JSON alert payload</p>
      </div>
      {canManageSettings && (
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      )}
    </form>
  );
}
