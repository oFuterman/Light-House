"use client";

import { useState, useEffect, useCallback } from "react";
import { api, Member, Role } from "@/lib/api";
import { useAuth } from "@/contexts/auth";

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: "owner", label: "Owner", description: "Full access, can delete org" },
  { value: "admin", label: "Admin", description: "Manage members and settings" },
  { value: "member", label: "Member", description: "View and create resources" },
];

function RoleInfoTooltip() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.bottom + 8 });
  };

  return (
    <span className="inline-block ml-1">
      <button
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPosition(null)}
        className="text-gray-400 hover:text-gray-600 cursor-help dark:text-gray-500 dark:hover:text-gray-300"
      >
        <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {position && (
        <div
          className="fixed z-50 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg"
          style={{ left: position.x, top: position.y }}
        >
          <div className="absolute -top-1.5 left-2 w-3 h-3 bg-gray-900 rotate-45"></div>
          <div className="mb-2 font-semibold text-sm">Role Permissions</div>
          <div className="space-y-2">
            <div>
              <span className="font-medium text-purple-300">Owner</span>
              <ul className="mt-0.5 ml-3 text-gray-300 list-disc">
                <li>Full access to all features</li>
                <li>Transfer ownership</li>
                <li>Delete organization</li>
              </ul>
            </div>
            <div>
              <span className="font-medium text-blue-300">Admin</span>
              <ul className="mt-0.5 ml-3 text-gray-300 list-disc">
                <li>Manage members &amp; invites</li>
                <li>Manage API keys &amp; settings</li>
                <li>View audit logs</li>
              </ul>
            </div>
            <div>
              <span className="font-medium text-gray-300">Member</span>
              <ul className="mt-0.5 ml-3 text-gray-400 list-disc">
                <li>View all resources</li>
                <li>Create &amp; edit checks</li>
                <li>View logs &amp; traces</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

export function MembersTab() {
  const { user, isOwner, canManageMembers } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await api.getMembers();
      setMembers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async (memberId: number, newRole: Role) => {
    setActionLoading(memberId);
    try {
      await api.updateMemberRole(memberId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    setActionLoading(memberId);
    try {
      await api.removeMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferOwnership = async (memberId: number) => {
    if (!confirm("Are you sure you want to transfer ownership? You will become an admin.")) return;

    setActionLoading(memberId);
    try {
      await api.transferOwnership(memberId);
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer ownership");
    } finally {
      setActionLoading(null);
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
      <h2 className="text-lg font-semibold mb-4">Organization Members</h2>
      <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">
        Manage team members and their roles within your organization.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm dark:bg-red-900/30 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                Role
                <RoleInfoTooltip />
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Joined</th>
              {canManageMembers && (
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isCurrentUser = member.id === user?.id;
              const isEditing = editingId === member.id;
              const isActionLoading = actionLoading === member.id;

              return (
                <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <span className="text-sm">{member.email}</span>
                      {isCurrentUser && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded dark:bg-blue-900/40 dark:text-blue-400">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {isEditing ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                        disabled={isActionLoading}
                        className="text-sm border border-gray-300 rounded px-2 py-1 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        autoFocus
                        onBlur={() => setEditingId(null)}
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-sm capitalize px-2 py-0.5 rounded ${
                        member.role === "owner"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"
                          : member.role === "admin"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      }`}>
                        {member.role}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  {canManageMembers && (
                    <td className="py-3 px-4 text-right">
                      {isActionLoading ? (
                        <span className="text-sm text-gray-400">Loading...</span>
                      ) : isCurrentUser ? (
                        <span className="text-sm text-gray-400">-</span>
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          {/* Only owners can change roles */}
                          {isOwner && member.role !== "owner" && (
                            <button
                              onClick={() => setEditingId(member.id)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Change Role
                            </button>
                          )}
                          {/* Transfer ownership (owner only) */}
                          {isOwner && member.role !== "owner" && (
                            <button
                              onClick={() => handleTransferOwnership(member.id)}
                              className="text-sm text-purple-600 hover:text-purple-800"
                            >
                              Transfer Ownership
                            </button>
                          )}
                          {/* Remove member */}
                          {(isOwner || (canManageMembers && member.role === "member")) && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {members.length === 0 && (
        <p className="text-center text-gray-500 py-8 dark:text-gray-400">No members found.</p>
      )}
    </div>
  );
}
