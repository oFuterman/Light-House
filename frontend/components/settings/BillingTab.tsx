"use client";

import { useState, useEffect, useCallback } from "react";
import { api, BillingResponse, Plan, PlanInfo } from "@/lib/api";
import { useAuth } from "@/contexts/auth";

const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    "10 uptime checks",
    "5-minute intervals",
    "7-day log retention",
    "500 MB logs/month",
    "Email + Slack + Webhook alerts",
    "1 AI query/day",
  ],
  indie_pro: [
    "25 uptime checks",
    "60-second intervals",
    "30-day log retention",
    "5 GB logs/month",
    "1 status page",
    "Unlimited AI Level 1",
    "30 AI Level 2 queries/month",
  ],
  team: [
    "75 uptime checks",
    "30-second intervals",
    "90-day log retention",
    "20 GB logs/month",
    "3 status pages",
    "PagerDuty + OpsGenie",
    "Unlimited AI Level 1-2",
    "30 AI Level 3 queries/month",
  ],
  agency: [
    "250 uptime checks",
    "30-second intervals",
    "180-day log retention",
    "50 GB logs/month",
    "Unlimited status pages",
    "Sub-organizations",
    "Custom branding",
    "Unlimited AI",
  ],
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}/mo`;
}

function UsageMeter({
    label,
    current,
    limit,
    formatValue = (v) => v.toString(),
}: {
    label: string;
    current: number;
    limit: number;
    formatValue?: (v: number) => string;
}) {
    const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
    const isUnlimited = limit < 0;
    const isWarning = percentage >= 80 && percentage < 100;
    const isOver = percentage >= 100;

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                <span className={`font-medium ${isOver ? "text-red-600 dark:text-red-400" : isWarning ? "text-yellow-600 dark:text-yellow-400" : "text-gray-900 dark:text-white"}`}>
                    {formatValue(current)} / {isUnlimited ? "Unlimited" : formatValue(limit)}
                </span>
            </div>
            {!isUnlimited && (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                    <div
                        className={`h-full transition-all ${
                            isOver ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            )}
        </div>
    );
}

function PlanCard({
    plan,
    billing,
    onUpgrade,
    isLoading,
}: {
    plan: PlanInfo;
    billing: BillingResponse;
    onUpgrade: (plan: Plan) => void;
    isLoading: boolean;
}) {
    const isCurrent = plan.is_current;
    const isUpgrade = plan.price_cents > billing.plan_config.MonthlyPriceCents;
    const features = PLAN_FEATURES[plan.id as Plan] || [];

    return (
        <div
            className={`relative rounded-lg border-2 p-4 flex flex-col ${
                isCurrent ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            }`}
        >
            {isCurrent && (
                <div className="absolute -top-3 left-4 bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded">
                    Current Plan
                </div>
            )}
            <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(plan.price_cents)}</div>
            </div>
            <ul className="space-y-2 mb-4 text-sm text-gray-600 flex-grow dark:text-gray-400">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                            />
                        </svg>
                        {feature}
                    </li>
                ))}
            </ul>
            {!isCurrent && isUpgrade && (
                <button
                    onClick={() => onUpgrade(plan.id as Plan)}
                    disabled={isLoading}
                    className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                >
                    {isLoading ? "Loading..." : "Upgrade"}
                </button>
            )}
        </div>
    );
}

export function BillingTab() {
  const { isOwner } = useAuth();
  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const fetchBilling = useCallback(async () => {
    try {
      const data = await api.getBilling();
      setBilling(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleUpgrade = async (plan: Plan) => {
    setUpgradeLoading(true);
    try {
      const { checkout_url } = await api.createCheckoutSession(plan);
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create checkout session");
      setUpgradeLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setUpgradeLoading(true);
    try {
      const { portal_url } = await api.createPortalSession();
      window.location.href = portal_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
      setUpgradeLoading(false);
    }
  };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                {error}
            </div>
        );
    }

    if (!billing) return null;

    const config = billing.plan_config;

    return (
        <div className="space-y-8">
            {/* Current Plan Status */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Current Plan: {config.Name}</h2>
                        {billing.subscription_status && (
                            <div className="flex items-center mt-1">
                                <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                        billing.subscription_status === "active"
                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                            : billing.subscription_status === "past_due"
                                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                    }`}
                                >
                                    {billing.subscription_status === "active" && "Active"}
                                    {billing.subscription_status === "past_due" && "Payment Due"}
                                    {billing.subscription_status === "canceled" && "Canceled"}
                                </span>
                                {billing.cancel_at_period_end && billing.current_period_end && (
                                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                        Cancels on {new Date(billing.current_period_end).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {isOwner && billing.plan !== "free" && (
                        <button
                            onClick={handleManageBilling}
                            disabled={upgradeLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                            Manage Billing
                        </button>
                    )}
                </div>

                {/* Usage Meters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UsageMeter
                        label="Uptime Checks"
                        current={billing.usage.check_count}
                        limit={config.MaxChecks}
                    />
                    <UsageMeter
                        label="Log Volume (this month)"
                        current={billing.usage.log_volume_bytes}
                        limit={config.LogVolumeBytesPerMonth}
                        formatValue={formatBytes}
                    />
                    <UsageMeter
                        label="API Keys"
                        current={billing.usage.api_key_count}
                        limit={config.MaxAPIKeys}
                    />
                    <UsageMeter
                        label="Status Pages"
                        current={billing.usage.status_page_count}
                        limit={config.MaxStatusPages}
                    />
                </div>

                {/* Warnings */}
                {billing.entitlements.violations && billing.entitlements.violations.length > 0 && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
                        <div className="flex">
                            <svg className="w-5 h-5 text-yellow-600 mr-2 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <div>
                                <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Usage Limits Exceeded</h4>
                                <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                                    {billing.entitlements.violations.map((v, i) => (
                                        <li key={i}>{v.message}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Available Plans */}
            {isOwner && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white">Available Plans</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {billing.available_plans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                billing={billing}
                                onUpgrade={handleUpgrade}
                                isLoading={upgradeLoading}
                            />
                        ))}
                    </div>
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        All plans include unlimited team members. No per-seat charges.
                    </p>
                </div>
            )}

            {!isOwner && (
                <div className="bg-gray-50 rounded-lg p-4 text-gray-600 text-sm dark:bg-gray-700 dark:text-gray-400">
                    Only the organization owner can manage billing and subscriptions.
                </div>
            )}
        </div>
    );
}
