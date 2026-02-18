package billing

import (
    "fmt"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/oFuterman/light-house/internal/models"
)

// Violation represents a single limit violation
type Violation struct {
    Resource string `json:"resource"`
    Current  int64  `json:"current"`
    Limit    int64  `json:"limit"`
    Message  string `json:"message"`
}

// EntitlementResult is the output of the entitlement check
type EntitlementResult struct {
    WithinLimits bool               `json:"within_limits"`
    Violations   []Violation        `json:"violations,omitempty"`
    Thresholds   map[string]float64 `json:"thresholds"` // resource -> usage percentage (0.0-1.0+)
}

// EffectivePlan returns the plan to use for entitlement checks.
// During an active trial, the org gets Team-level entitlements.
// For paid plans with a canceled subscription status, defensively returns Free
// (catches missed subscription.deleted webhooks).
// past_due keeps full access — Stripe handles dunning and auto-cancels.
func EffectivePlan(org *models.Organization) models.Plan {
    // 1. Active reverse trial → Team
    if org.IsTrialing && org.TrialEndAt != nil && org.TrialEndAt.After(time.Now()) {
        return models.PlanTeam
    }
    // 2. Invalid plan → Free
    if !org.Plan.IsValid() {
        return models.PlanFree
    }
    // 3. Free plan → no subscription status to check
    if org.Plan == models.PlanFree {
        return models.PlanFree
    }
    // 4. Paid plan with canceled status → defensive downgrade
    if org.StripeSubscriptionStatus != nil && *org.StripeSubscriptionStatus == "canceled" {
        return models.PlanFree
    }
    return org.Plan
}

// EntitlementError builds a standardized entitlement limit error response.
func EntitlementError(msg, limitType string) fiber.Map {
    return fiber.Map{
        "error":       msg,
        "code":        "ENTITLEMENT_LIMIT",
        "limit_type":  limitType,
        "upgrade_url": "/settings?tab=billing",
    }
}

// CheckEntitlements evaluates whether an org's usage is within plan limits
// This is used for enforcement decisions and UI display
func CheckEntitlements(plan models.Plan, usage models.UsageSnapshot) EntitlementResult {
    config := models.GetPlanConfig(plan)
    result := EntitlementResult{
        WithinLimits: true,
        Violations:   []Violation{},
        Thresholds:   make(map[string]float64),
    }

    // Check: Uptime checks count
    if config.MaxChecks > 0 {
        ratio := float64(usage.CheckCount) / float64(config.MaxChecks)
        result.Thresholds["checks"] = ratio
        if usage.CheckCount > config.MaxChecks {
            result.WithinLimits = false
            result.Violations = append(result.Violations, Violation{
                Resource: "checks",
                Current:  int64(usage.CheckCount),
                Limit:    int64(config.MaxChecks),
                Message:  fmt.Sprintf("Check limit exceeded: %d/%d", usage.CheckCount, config.MaxChecks),
            })
        }
    } else {
        result.Thresholds["checks"] = 0 // unlimited
    }

    // Check: Log volume
    if config.LogVolumeBytesPerMonth > 0 {
        ratio := float64(usage.LogVolumeBytes) / float64(config.LogVolumeBytesPerMonth)
        result.Thresholds["log_volume"] = ratio
        if usage.LogVolumeBytes > config.LogVolumeBytesPerMonth {
            result.WithinLimits = false
            result.Violations = append(result.Violations, Violation{
                Resource: "log_volume",
                Current:  usage.LogVolumeBytes,
                Limit:    config.LogVolumeBytesPerMonth,
                Message:  fmt.Sprintf("Log volume limit exceeded: %s/%s", formatBytes(usage.LogVolumeBytes), formatBytes(config.LogVolumeBytesPerMonth)),
            })
        }
    } else {
        result.Thresholds["log_volume"] = 0
    }

    // Check: Status pages
    if config.MaxStatusPages >= 0 { // -1 = unlimited
        if config.MaxStatusPages > 0 {
            ratio := float64(usage.StatusPageCount) / float64(config.MaxStatusPages)
            result.Thresholds["status_pages"] = ratio
        }
        if usage.StatusPageCount > config.MaxStatusPages {
            result.WithinLimits = false
            result.Violations = append(result.Violations, Violation{
                Resource: "status_pages",
                Current:  int64(usage.StatusPageCount),
                Limit:    int64(config.MaxStatusPages),
                Message:  fmt.Sprintf("Status page limit exceeded: %d/%d", usage.StatusPageCount, config.MaxStatusPages),
            })
        }
    } else {
        result.Thresholds["status_pages"] = 0
    }

    // Check: API keys
    if config.MaxAPIKeys >= 0 { // -1 = unlimited
        if config.MaxAPIKeys > 0 {
            ratio := float64(usage.APIKeyCount) / float64(config.MaxAPIKeys)
            result.Thresholds["api_keys"] = ratio
        }
        if usage.APIKeyCount > config.MaxAPIKeys {
            result.WithinLimits = false
            result.Violations = append(result.Violations, Violation{
                Resource: "api_keys",
                Current:  int64(usage.APIKeyCount),
                Limit:    int64(config.MaxAPIKeys),
                Message:  fmt.Sprintf("API key limit exceeded: %d/%d", usage.APIKeyCount, config.MaxAPIKeys),
            })
        }
    } else {
        result.Thresholds["api_keys"] = 0
    }

    // Check: AI Level 1 calls
    if config.AILevel1Limit >= 0 { // -1 = unlimited
        if config.AILevel1Limit > 0 {
            ratio := float64(usage.AILevel1Calls) / float64(config.AILevel1Limit)
            result.Thresholds["ai_level1"] = ratio
        }
        if usage.AILevel1Calls > config.AILevel1Limit {
            result.WithinLimits = false
            result.Violations = append(result.Violations, Violation{
                Resource: "ai_level1",
                Current:  int64(usage.AILevel1Calls),
                Limit:    int64(config.AILevel1Limit),
                Message:  fmt.Sprintf("AI Level 1 limit exceeded: %d/%d", usage.AILevel1Calls, config.AILevel1Limit),
            })
        }
    } else {
        result.Thresholds["ai_level1"] = 0
    }

    // Check: AI Level 2 calls
    if config.AILevel2Limit >= 0 {
        if config.AILevel2Limit > 0 {
            ratio := float64(usage.AILevel2Calls) / float64(config.AILevel2Limit)
            result.Thresholds["ai_level2"] = ratio
        }
        if usage.AILevel2Calls > config.AILevel2Limit {
            result.WithinLimits = false
            result.Violations = append(result.Violations, Violation{
                Resource: "ai_level2",
                Current:  int64(usage.AILevel2Calls),
                Limit:    int64(config.AILevel2Limit),
                Message:  fmt.Sprintf("AI Level 2 limit exceeded: %d/%d", usage.AILevel2Calls, config.AILevel2Limit),
            })
        }
    } else {
        result.Thresholds["ai_level2"] = 0
    }

    // Check: AI Level 3 calls
    if config.AILevel3Limit >= 0 {
        if config.AILevel3Limit > 0 {
            ratio := float64(usage.AILevel3Calls) / float64(config.AILevel3Limit)
            result.Thresholds["ai_level3"] = ratio
        }
        if usage.AILevel3Calls > config.AILevel3Limit {
            result.WithinLimits = false
            result.Violations = append(result.Violations, Violation{
                Resource: "ai_level3",
                Current:  int64(usage.AILevel3Calls),
                Limit:    int64(config.AILevel3Limit),
                Message:  fmt.Sprintf("AI Level 3 limit exceeded: %d/%d", usage.AILevel3Calls, config.AILevel3Limit),
            })
        }
    } else {
        result.Thresholds["ai_level3"] = 0
    }

    return result
}

// CanCreateCheck returns true if the org can create another check
func CanCreateCheck(plan models.Plan, currentCheckCount int) (bool, string) {
    config := models.GetPlanConfig(plan)
    if config.MaxChecks <= 0 {
        return true, "" // unlimited
    }
    if currentCheckCount >= config.MaxChecks {
        return false, fmt.Sprintf("Check limit reached (%d/%d). Upgrade your plan to add more checks.", currentCheckCount, config.MaxChecks)
    }
    return true, ""
}

// CanIngestLogs returns true if the org can ingest more logs this month
// Returns: (allowed, atWarningThreshold, message)
func CanIngestLogs(plan models.Plan, currentBytes int64, incomingBytes int64) (bool, bool, string) {
    config := models.GetPlanConfig(plan)
    if config.LogVolumeBytesPerMonth <= 0 {
        return true, false, "" // unlimited
    }
    newTotal := currentBytes + incomingBytes
    ratio := float64(newTotal) / float64(config.LogVolumeBytesPerMonth)
    // Hard limit at 150%
    if ratio >= 1.5 {
        return false, true, fmt.Sprintf("Log volume limit exceeded (%s/%s). Upgrade your plan to continue ingesting logs.", formatBytes(newTotal), formatBytes(config.LogVolumeBytesPerMonth))
    }
    // Warning at 80%
    warning := ratio >= 0.8
    if warning && ratio < 1.0 {
        return true, true, fmt.Sprintf("Approaching log limit: %s/%s (%.0f%%)", formatBytes(newTotal), formatBytes(config.LogVolumeBytesPerMonth), ratio*100)
    }
    if ratio >= 1.0 {
        return true, true, fmt.Sprintf("Log limit reached: %s/%s. New logs may be rejected soon.", formatBytes(newTotal), formatBytes(config.LogVolumeBytesPerMonth))
    }
    return true, false, ""
}

// CanUseCheckInterval returns true if the requested interval is allowed for the plan
func CanUseCheckInterval(plan models.Plan, intervalSeconds int) (bool, string) {
    config := models.GetPlanConfig(plan)
    if intervalSeconds < config.CheckIntervalMinSeconds {
        return false, fmt.Sprintf("Minimum check interval for %s plan is %d seconds. Upgrade for faster intervals.", config.Name, config.CheckIntervalMinSeconds)
    }
    return true, ""
}

// CanCreateAPIKey returns true if the org can create another API key
func CanCreateAPIKey(plan models.Plan, currentCount int) (bool, string) {
    config := models.GetPlanConfig(plan)
    if config.MaxAPIKeys < 0 {
        return true, "" // unlimited
    }
    if currentCount >= config.MaxAPIKeys {
        return false, fmt.Sprintf("API key limit reached (%d/%d). Upgrade your plan to add more.", currentCount, config.MaxAPIKeys)
    }
    return true, ""
}

// CanCreateStatusPage returns true if the org can create another status page
func CanCreateStatusPage(plan models.Plan, currentCount int) (bool, string) {
    config := models.GetPlanConfig(plan)
    if config.MaxStatusPages < 0 {
        return true, "" // unlimited
    }
    if currentCount >= config.MaxStatusPages {
        return false, fmt.Sprintf("Status page limit reached (%d/%d). Upgrade your plan to add more.", currentCount, config.MaxStatusPages)
    }
    return true, ""
}

// CanUseAI returns true if the org can use AI at the specified level
func CanUseAI(plan models.Plan, level int, currentCalls int) (bool, string) {
    config := models.GetPlanConfig(plan)
    var limit int
    switch level {
    case 1:
        limit = config.AILevel1Limit
    case 2:
        limit = config.AILevel2Limit
    case 3:
        limit = config.AILevel3Limit
    default:
        return false, "Invalid AI level"
    }
    if limit < 0 {
        return true, "" // unlimited
    }
    if limit == 0 {
        return false, fmt.Sprintf("AI Level %d is not available on your plan. Upgrade to access this feature.", level)
    }
    if currentCalls >= limit {
        return false, fmt.Sprintf("AI Level %d limit reached (%d/%d). Limit resets next month.", level, currentCalls, limit)
    }
    return true, ""
}

// formatBytes formats bytes into human-readable string
func formatBytes(bytes int64) string {
    const (
        KB = 1024
        MB = KB * 1024
        GB = MB * 1024
    )
    switch {
    case bytes >= GB:
        return fmt.Sprintf("%.1f GB", float64(bytes)/float64(GB))
    case bytes >= MB:
        return fmt.Sprintf("%.1f MB", float64(bytes)/float64(MB))
    case bytes >= KB:
        return fmt.Sprintf("%.1f KB", float64(bytes)/float64(KB))
    default:
        return fmt.Sprintf("%d B", bytes)
    }
}
