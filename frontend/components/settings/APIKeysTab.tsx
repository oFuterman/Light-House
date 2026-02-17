"use client";

import { useState, useEffect, useCallback } from "react";
import { api, APIKey, API_KEY_SCOPES } from "@/lib/api";
import { useAuth } from "@/contexts/auth";

export function APIKeysTab() {
  const { canManageSettings } = useAuth();
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formScopes, setFormScopes] = useState<string[]>(["logs:write"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const fetchAPIKeys = useCallback(async () => {
    try {
      const data = await api.getAPIKeys();
      setAPIKeys(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAPIKeys();
  }, [fetchAPIKeys]);

  const handleScopeToggle = (scope: string) => {
    setFormScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formScopes.length === 0) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await api.createAPIKey(formName.trim(), formScopes);
      setAPIKeys((prev) => [result.api_key, ...prev]);
      setNewKey(result.key);
      setFormName("");
      setFormScopes(["logs:write"]);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this API key? This cannot be undone.")) return;

    setActionLoading(id);
    try {
      await api.deleteAPIKey(id);
      setAPIKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete API key");
    } finally {
      setActionLoading(null);
    }
  };

  const copyKey = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
      alert("API key copied to clipboard!");
    }
  };

  const getScopeLabel = (scope: string) => {
    const info = API_KEY_SCOPES.find((s) => s.value === scope);
    return info?.label || scope;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-gray-600">
            Manage API keys for programmatic access to your organization.
          </p>
        </div>
        {canManageSettings && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "Create API Key"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {newKey && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 font-medium mb-2">
            API key created! Copy it now - you won&apos;t be able to see it again.
          </p>
          <div className="flex items-center space-x-2">
            <code className="flex-1 text-sm bg-white border border-yellow-200 rounded px-3 py-2 font-mono break-all">
              {newKey}
            </code>
            <button
              onClick={copyKey}
              className="px-3 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Copy
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showForm && canManageSettings && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Production Logging"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Permissions
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {API_KEY_SCOPES.map((scope) => (
                <label
                  key={scope.value}
                  className={`
                    flex items-center p-2 border rounded cursor-pointer text-sm
                    ${formScopes.includes(scope.value)
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : "border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-600/50"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={formScopes.includes(scope.value)}
                    onChange={() => handleScopeToggle(scope.value)}
                    className="mr-2"
                  />
                  <div>
                    <span className="font-medium">{scope.label}</span>
                    <p className="text-xs text-gray-500">{scope.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !formName.trim() || formScopes.length === 0}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create API Key"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Key Prefix</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Permissions</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Last Used</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
              {canManageSettings && (
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {apiKeys.map((apiKey) => {
              const isActionLoading = actionLoading === apiKey.id;

              return (
                <tr key={apiKey.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium">{apiKey.name}</td>
                  <td className="py-3 px-4">
                    <code className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {apiKey.prefix}...
                    </code>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {apiKey.scopes.slice(0, 3).map((scope) => (
                        <span
                          key={scope}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                        >
                          {getScopeLabel(scope)}
                        </span>
                      ))}
                      {apiKey.scopes.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{apiKey.scopes.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {apiKey.last_used_at
                      ? new Date(apiKey.last_used_at).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {new Date(apiKey.created_at).toLocaleDateString()}
                    {apiKey.created_by && (
                      <span className="block text-xs text-gray-400">by {apiKey.created_by}</span>
                    )}
                  </td>
                  {canManageSettings && (
                    <td className="py-3 px-4 text-right">
                      {isActionLoading ? (
                        <span className="text-sm text-gray-400">Deleting...</span>
                      ) : (
                        <button
                          onClick={() => handleDelete(apiKey.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {apiKeys.length === 0 && (
        <p className="text-center text-gray-500 py-8">No API keys yet.</p>
      )}
    </div>
  );
}
