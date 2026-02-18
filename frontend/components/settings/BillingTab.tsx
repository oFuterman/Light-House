"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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

// --- Helpers ---

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}/mo`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// Determine highest warning band from thresholds: "normal" | "warning" | "critical" | "urgent"
type WarningBand = "normal" | "warning" | "critical" | "urgent";

function getHighestBand(thresholds: Record<string, number>): WarningBand {
  let max = 0;
  for (const ratio of Object.values(thresholds)) {
    if (ratio > max) max = ratio;
  }
  if (max >= 1.2) return "urgent";
  if (max >= 1.0) return "critical";
  if (max >= 0.8) return "warning";
  return "normal";
}

function getResourcesInBand(thresholds: Record<string, number>, minRatio: number, maxRatio: number): string[] {
  const LABELS: Record<string, string> = {
    checks: "Uptime Checks",
    log_volume: "Log Volume",
    status_pages: "Status Pages",
    api_keys: "API Keys",
    ai_level1: "AI Level 1",
    ai_level2: "AI Level 2",
    ai_level3: "AI Level 3",
  };
  return Object.entries(thresholds)
    .filter(([, ratio]) => ratio >= minRatio && ratio < maxRatio)
    .map(([key]) => LABELS[key] || key);
}

// --- Sub-components ---

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
            className={`h-full transition-all ${isOver ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-blue-500"}`}
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
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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

function StatusBadge({ billing }: { billing: BillingResponse }) {
  const status = billing.subscription_status;

  if (billing.is_trialing) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
        Trial
      </span>
    );
  }

  if (!status) return null;

  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    past_due: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    canceled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    trialing: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  };

  const labels: Record<string, string> = {
    active: "Active",
    past_due: "Payment Due",
    canceled: "Canceled",
    trialing: "Trial",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.active}`}>
      {labels[status] || status}
    </span>
  );
}

function DismissibleBanner({
  type,
  title,
  children,
  onDismiss,
}: {
  type: "success" | "info" | "warning" | "critical" | "urgent";
  title: string;
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  const styles = {
    success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300",
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300",
    critical: "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300",
    urgent: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300",
  };

  return (
    <div className={`rounded-lg border p-4 ${styles[type]}`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium">{title}</h4>
          <div className="mt-1 text-sm">{children}</div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="ml-4 flex-shrink-0 opacity-60 hover:opacity-100">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// --- Main Component ---

export function BillingTab() {
  const { isOwner } = useAuth();
  const searchParams = useSearchParams();

  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // Checkout redirect banners
  const checkoutParam = searchParams.get("checkout");
  const [checkoutBannerDismissed, setCheckoutBannerDismissed] = useState(false);

  // Threshold warning banner dismissal — keyed by band so re-appears when band changes
  const [dismissedBand, setDismissedBand] = useState<WarningBand | null>(null);

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

  // On checkout success, refetch to pick up plan changes
  useEffect(() => {
    if (checkoutParam === "success") {
      fetchBilling();
    }
  }, [checkoutParam, fetchBilling]);

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

  if (error && !billing) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!billing) return null;

  const config = billing.plan_config;
  const thresholds = billing.entitlements.thresholds;
  const currentBand = getHighestBand(thresholds);
  const showThresholdBanner = currentBand !== "normal" && dismissedBand !== currentBand;

  return (
    <div className="space-y-6">
      {/* Checkout redirect banners */}
      {checkoutParam === "success" && !checkoutBannerDismissed && (
        <DismissibleBanner type="success" title="Payment complete" onDismiss={() => setCheckoutBannerDismissed(true)}>
          Your subscription is being activated. It may take a moment for your plan to update.
        </DismissibleBanner>
      )}
      {checkoutParam === "cancel" && !checkoutBannerDismissed && (
        <DismissibleBanner type="info" title="Checkout canceled" onDismiss={() => setCheckoutBannerDismissed(true)}>
          No changes were made to your subscription.
        </DismissibleBanner>
      )}

      {/* Error banner (non-fatal — shown alongside billing data if we have it) */}
      {error && (
        <DismissibleBanner type="warning" title="Error" onDismiss={() => setError(null)}>
          {error}
        </DismissibleBanner>
      )}

      {/* Past-due warning */}
      {billing.subscription_status === "past_due" && (
        <DismissibleBanner type="urgent" title="Payment issue">
          <p>We were unable to process your last payment. Your plan remains active during the grace period, but may be downgraded if the issue isn&apos;t resolved.</p>
          {isOwner && (
            <button
              onClick={handleManageBilling}
              disabled={upgradeLoading}
              className="mt-2 px-4 py-1.5 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              Update Payment Method
            </button>
          )}
          {!isOwner && <p className="mt-1 text-sm opacity-75">Ask your organization owner to update the payment method.</p>}
        </DismissibleBanner>
      )}

      {/* Trialing banner */}
      {billing.is_trialing && (
        <DismissibleBanner type="info" title={`${config.Name} trial`}>
          {billing.trial_end_at ? (
            <p>Your trial ends on {formatDate(billing.trial_end_at)}. After the trial, your organization will be downgraded to the Free plan. No data will be deleted and new resource creation will be paused until you upgrade.</p>
          ) : (
            <p>You&apos;re on a trial of the {config.Name} plan. After the trial, your organization will be downgraded to the Free plan unless you subscribe.</p>
          )}
          {isOwner && billing.plan !== "free" && (
            <button
              onClick={handleManageBilling}
              disabled={upgradeLoading}
              className="mt-2 px-4 py-1.5 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Subscribe Now
            </button>
          )}
        </DismissibleBanner>
      )}

      {/* Threshold-based usage warning banners */}
      {showThresholdBanner && currentBand === "warning" && (
        <DismissibleBanner type="warning" title="Approaching plan limits" onDismiss={() => setDismissedBand("warning")}>
          <p>You&apos;ve used over 80% of your {getResourcesInBand(thresholds, 0.8, 1.0).join(", ")} quota. Consider upgrading to avoid hitting limits.</p>
        </DismissibleBanner>
      )}
      {showThresholdBanner && currentBand === "critical" && (
        <DismissibleBanner type="critical" title="Plan limits reached" onDismiss={() => setDismissedBand("critical")}>
          <p>You&apos;ve reached the limit for {getResourcesInBand(thresholds, 1.0, 1.2).join(", ")}. New resource creation may be blocked until you upgrade. No existing data will be affected.</p>
        </DismissibleBanner>
      )}
      {showThresholdBanner && currentBand === "urgent" && (
        <DismissibleBanner type="urgent" title="Plan limits significantly exceeded" onDismiss={() => setDismissedBand("urgent")}>
          <p>You&apos;re at over 120% of your plan limit for {getResourcesInBand(thresholds, 1.2, Infinity).join(", ")}. New ingestion may be rejected. Upgrade your plan to restore full access.</p>
        </DismissibleBanner>
      )}

      {/* Current Plan Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{config.Name}</h2>
              <StatusBadge billing={billing} />
            </div>

            {/* Subscription status details */}
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {billing.plan === "free" && !billing.is_trialing && (
                <span>Free plan — no subscription</span>
              )}
              {billing.subscription_status === "active" && !billing.cancel_at_period_end && billing.current_period_end && (
                <span>Renews on {formatDate(billing.current_period_end)}</span>
              )}
              {billing.cancel_at_period_end && billing.current_period_end && (
                <span className="text-yellow-600 dark:text-yellow-400">
                  Cancels on {formatDate(billing.current_period_end)} — you&apos;ll be downgraded to Free. No data will be deleted.
                </span>
              )}
            </div>
          </div>

          {/* Manage Billing / Upgrade CTA */}
          {isOwner && billing.plan !== "free" && (
            <button
              onClick={handleManageBilling}
              disabled={upgradeLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Manage Billing
            </button>
          )}
        </div>

        {/* Usage Meters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UsageMeter label="Uptime Checks" current={billing.usage.check_count} limit={config.MaxChecks} />
          <UsageMeter label="Log Volume (this month)" current={billing.usage.log_volume_bytes} limit={config.LogVolumeBytesPerMonth} formatValue={formatBytes} />
          <UsageMeter label="API Keys" current={billing.usage.api_key_count} limit={config.MaxAPIKeys} />
          <UsageMeter label="Status Pages" current={billing.usage.status_page_count} limit={config.MaxStatusPages} />
        </div>
      </div>

      {/* Available Plans (owner only) */}
      {isOwner && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {billing.available_plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} billing={billing} onUpgrade={handleUpgrade} isLoading={upgradeLoading} />
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
