"use client";

import { useState, useEffect, useCallback } from "react";
import { api, Invite, Role, InviteStatus } from "@/lib/api";
import { useAuth } from "@/contexts/auth";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

const STATUS_STYLES: Record<InviteStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  expired: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  revoked: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

export function InvitesTab() {
  const { isOwner } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<Role>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const data = await api.getInvites();
      setInvites(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invites");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await api.createInvite(formEmail.trim(), formRole);
      setInvites((prev) => [result.invite, ...prev]);
      setLastInviteLink(window.location.origin + result.invite_link);
      setFormEmail("");
      setFormRole("member");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (inviteId: number) => {
    if (!confirm("Are you sure you want to revoke this invite?")) return;

    setActionLoading(inviteId);
    try {
      await api.revokeInvite(inviteId);
      setInvites((prev) =>
        prev.map((inv) =>
          inv.id === inviteId ? { ...inv, status: "revoked" as InviteStatus } : inv
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invite");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResend = async (inviteId: number) => {
    setActionLoading(inviteId);
    try {
      const result = await api.resendInvite(inviteId);
      setLastInviteLink(window.location.origin + result.invite_link);
      await fetchInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend invite");
    } finally {
      setActionLoading(null);
    }
  };

  const copyInviteLink = async () => {
    if (lastInviteLink) {
      await navigator.clipboard.writeText(lastInviteLink);
      alert("Invite link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Invitations</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Invite new members to your organization.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Invite Member"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm dark:bg-red-900/30 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {lastInviteLink && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/30 dark:border-green-800">
          <p className="text-sm text-green-800 font-medium mb-2 dark:text-green-300">Invite created successfully!</p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={lastInviteLink}
              readOnly
              className="flex-1 text-sm bg-white border border-green-200 rounded px-2 py-1 text-gray-900 dark:bg-gray-800 dark:border-green-800 dark:text-gray-100"
            />
            <button
              onClick={copyInviteLink}
              className="text-sm text-green-700 hover:text-green-900 underline dark:text-green-400 dark:hover:text-green-300"
            >
              Copy
            </button>
            <button
              onClick={() => setLastInviteLink(null)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as Role)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                {isOwner && <option value="owner">Owner</option>}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Role</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Invited By</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Expires</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => {
              const isActionLoading = actionLoading === invite.id;
              const isPending = invite.status === "pending";

              return (
                <tr key={invite.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-sm">{invite.email}</td>
                  <td className="py-3 px-4">
                    <span className="text-sm capitalize">{invite.role}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${STATUS_STYLES[invite.status]}`}>
                      {invite.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{invite.invited_by}</td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(invite.expires_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isActionLoading ? (
                      <span className="text-sm text-gray-400">Loading...</span>
                    ) : isPending ? (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleResend(invite.id)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleRevoke(invite.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Revoke
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {invites.length === 0 && (
        <p className="text-center text-gray-500 py-8 dark:text-gray-400">No invitations yet.</p>
      )}
    </div>
  );
}
