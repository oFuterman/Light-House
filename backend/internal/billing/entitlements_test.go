package billing

import (
	"testing"
	"time"

	"github.com/oFuterman/light-house/internal/models"
)

// --- EffectivePlan ---

func TestEffectivePlan_ActiveTrial(t *testing.T) {
	future := time.Now().Add(24 * time.Hour)
	org := &models.Organization{
		Plan:       models.PlanFree,
		IsTrialing: true,
		TrialEndAt: &future,
	}
	if got := EffectivePlan(org); got != models.PlanTeam {
		t.Errorf("EffectivePlan(active trial) = %q, want %q", got, models.PlanTeam)
	}
}

func TestEffectivePlan_ExpiredTrial(t *testing.T) {
	past := time.Now().Add(-24 * time.Hour)
	org := &models.Organization{
		Plan:       models.PlanFree,
		IsTrialing: true,
		TrialEndAt: &past,
	}
	if got := EffectivePlan(org); got != models.PlanFree {
		t.Errorf("EffectivePlan(expired trial) = %q, want %q", got, models.PlanFree)
	}
}

func TestEffectivePlan_NoTrial(t *testing.T) {
	org := &models.Organization{Plan: models.PlanIndiePro}
	if got := EffectivePlan(org); got != models.PlanIndiePro {
		t.Errorf("EffectivePlan(no trial) = %q, want %q", got, models.PlanIndiePro)
	}
}

func TestEffectivePlan_InvalidPlan(t *testing.T) {
	org := &models.Organization{Plan: models.Plan("bogus")}
	if got := EffectivePlan(org); got != models.PlanFree {
		t.Errorf("EffectivePlan(invalid plan) = %q, want %q", got, models.PlanFree)
	}
}

func TestEffectivePlan_TrialingButNilEndAt(t *testing.T) {
	org := &models.Organization{
		Plan:       models.PlanIndiePro,
		IsTrialing: true,
		TrialEndAt: nil,
	}
	// IsTrialing but no TrialEndAt — fall through to stored plan
	if got := EffectivePlan(org); got != models.PlanIndiePro {
		t.Errorf("EffectivePlan(trialing, nil end) = %q, want %q", got, models.PlanIndiePro)
	}
}

// --- EffectivePlan: subscription status ---

func TestEffectivePlan_PaidPlanCanceledStatus(t *testing.T) {
	status := "canceled"
	org := &models.Organization{
		Plan:                     models.PlanTeam,
		StripeSubscriptionStatus: &status,
	}
	if got := EffectivePlan(org); got != models.PlanFree {
		t.Errorf("EffectivePlan(paid+canceled) = %q, want %q", got, models.PlanFree)
	}
}

func TestEffectivePlan_PaidPlanPastDueStatus(t *testing.T) {
	status := "past_due"
	org := &models.Organization{
		Plan:                     models.PlanTeam,
		StripeSubscriptionStatus: &status,
	}
	// past_due keeps full access — Stripe handles dunning
	if got := EffectivePlan(org); got != models.PlanTeam {
		t.Errorf("EffectivePlan(paid+past_due) = %q, want %q", got, models.PlanTeam)
	}
}

func TestEffectivePlan_PaidPlanActiveStatus(t *testing.T) {
	status := "active"
	org := &models.Organization{
		Plan:                     models.PlanIndiePro,
		StripeSubscriptionStatus: &status,
	}
	if got := EffectivePlan(org); got != models.PlanIndiePro {
		t.Errorf("EffectivePlan(paid+active) = %q, want %q", got, models.PlanIndiePro)
	}
}

func TestEffectivePlan_PaidPlanNilStatus(t *testing.T) {
	// Manual plan assignment, no Stripe — keep stored plan
	org := &models.Organization{
		Plan:                     models.PlanTeam,
		StripeSubscriptionStatus: nil,
	}
	if got := EffectivePlan(org); got != models.PlanTeam {
		t.Errorf("EffectivePlan(paid+nil status) = %q, want %q", got, models.PlanTeam)
	}
}

func TestEffectivePlan_FreePlanCanceledStatus(t *testing.T) {
	status := "canceled"
	org := &models.Organization{
		Plan:                     models.PlanFree,
		StripeSubscriptionStatus: &status,
	}
	if got := EffectivePlan(org); got != models.PlanFree {
		t.Errorf("EffectivePlan(free+canceled) = %q, want %q", got, models.PlanFree)
	}
}

func TestEffectivePlan_ActiveTrialOverridesCanceled(t *testing.T) {
	future := time.Now().Add(24 * time.Hour)
	status := "canceled"
	org := &models.Organization{
		Plan:                     models.PlanFree,
		IsTrialing:               true,
		TrialEndAt:               &future,
		StripeSubscriptionStatus: &status,
	}
	// Active trial wins over canceled status
	if got := EffectivePlan(org); got != models.PlanTeam {
		t.Errorf("EffectivePlan(active trial+canceled) = %q, want %q", got, models.PlanTeam)
	}
}

func TestEffectivePlan_ExpiredTrialWithCanceled(t *testing.T) {
	past := time.Now().Add(-24 * time.Hour)
	status := "canceled"
	org := &models.Organization{
		Plan:                     models.PlanTeam,
		IsTrialing:               true,
		TrialEndAt:               &past,
		StripeSubscriptionStatus: &status,
	}
	// Expired trial + canceled status → Free
	if got := EffectivePlan(org); got != models.PlanFree {
		t.Errorf("EffectivePlan(expired trial+canceled) = %q, want %q", got, models.PlanFree)
	}
}

// --- CanCreateCheck ---

func TestCanCreateCheck_BelowLimit(t *testing.T) {
	allowed, msg := CanCreateCheck(models.PlanFree, 5)
	if !allowed {
		t.Errorf("expected allowed, got blocked: %s", msg)
	}
}

func TestCanCreateCheck_AtLimit(t *testing.T) {
	config := models.GetPlanConfig(models.PlanFree)
	allowed, _ := CanCreateCheck(models.PlanFree, config.MaxChecks)
	if allowed {
		t.Error("expected blocked at limit, got allowed")
	}
}

func TestCanCreateCheck_Unlimited(t *testing.T) {
	// Agency has 250 checks — still limited, but test with 0 current
	allowed, _ := CanCreateCheck(models.PlanAgency, 0)
	if !allowed {
		t.Error("expected allowed for agency with 0 checks")
	}
}

// --- CanUseCheckInterval ---

func TestCanUseCheckInterval_BelowMin(t *testing.T) {
	// Free plan min is 300s
	allowed, _ := CanUseCheckInterval(models.PlanFree, 60)
	if allowed {
		t.Error("expected blocked for 60s on free plan")
	}
}

func TestCanUseCheckInterval_AtMin(t *testing.T) {
	config := models.GetPlanConfig(models.PlanFree)
	allowed, _ := CanUseCheckInterval(models.PlanFree, config.CheckIntervalMinSeconds)
	if !allowed {
		t.Error("expected allowed at exact minimum")
	}
}

func TestCanUseCheckInterval_AboveMin(t *testing.T) {
	allowed, _ := CanUseCheckInterval(models.PlanFree, 600)
	if !allowed {
		t.Error("expected allowed for 600s on free plan")
	}
}

// --- CanCreateAPIKey ---

func TestCanCreateAPIKey_BelowLimit(t *testing.T) {
	allowed, _ := CanCreateAPIKey(models.PlanFree, 1)
	if !allowed {
		t.Error("expected allowed below limit")
	}
}

func TestCanCreateAPIKey_AtLimit(t *testing.T) {
	config := models.GetPlanConfig(models.PlanFree)
	allowed, _ := CanCreateAPIKey(models.PlanFree, config.MaxAPIKeys)
	if allowed {
		t.Error("expected blocked at limit")
	}
}

func TestCanCreateAPIKey_Unlimited(t *testing.T) {
	// Agency has unlimited (-1) API keys
	allowed, _ := CanCreateAPIKey(models.PlanAgency, 1000)
	if !allowed {
		t.Error("expected allowed for unlimited plan")
	}
}

// --- CanIngestLogs ---

func TestCanIngestLogs_BelowThreshold(t *testing.T) {
	config := models.GetPlanConfig(models.PlanFree)
	current := int64(float64(config.LogVolumeBytesPerMonth) * 0.5)
	allowed, warning, _ := CanIngestLogs(models.PlanFree, current, 100)
	if !allowed {
		t.Error("expected allowed at 50%")
	}
	if warning {
		t.Error("expected no warning at 50%")
	}
}

func TestCanIngestLogs_WarningThreshold(t *testing.T) {
	config := models.GetPlanConfig(models.PlanFree)
	// Put current at 85%
	current := int64(float64(config.LogVolumeBytesPerMonth) * 0.85)
	allowed, warning, _ := CanIngestLogs(models.PlanFree, current, 100)
	if !allowed {
		t.Error("expected allowed at 85%")
	}
	if !warning {
		t.Error("expected warning at 85%")
	}
}

func TestCanIngestLogs_OverLimitButUnder150(t *testing.T) {
	config := models.GetPlanConfig(models.PlanFree)
	// Put at 120%
	current := int64(float64(config.LogVolumeBytesPerMonth) * 1.2)
	allowed, warning, _ := CanIngestLogs(models.PlanFree, current, 100)
	if !allowed {
		t.Error("expected allowed at 120% (under 150% hard limit)")
	}
	if !warning {
		t.Error("expected warning at 120%")
	}
}

func TestCanIngestLogs_HardReject(t *testing.T) {
	config := models.GetPlanConfig(models.PlanFree)
	// Put at 150%
	current := int64(float64(config.LogVolumeBytesPerMonth) * 1.5)
	allowed, _, _ := CanIngestLogs(models.PlanFree, current, 100)
	if allowed {
		t.Error("expected rejected at >=150%")
	}
}

// --- CanCreateStatusPage ---

func TestCanCreateStatusPage_AtLimit(t *testing.T) {
	// Free plan has 0 status pages
	allowed, _ := CanCreateStatusPage(models.PlanFree, 0)
	if allowed {
		t.Error("expected blocked when limit is 0")
	}
}

func TestCanCreateStatusPage_BelowLimit(t *testing.T) {
	// IndiePro has 1
	allowed, _ := CanCreateStatusPage(models.PlanIndiePro, 0)
	if !allowed {
		t.Error("expected allowed below limit")
	}
}

func TestCanCreateStatusPage_Unlimited(t *testing.T) {
	// Agency has unlimited (-1) status pages
	allowed, _ := CanCreateStatusPage(models.PlanAgency, 100)
	if !allowed {
		t.Error("expected allowed for unlimited plan")
	}
}

// --- CanUseAI ---

func TestCanUseAI_AtLimit(t *testing.T) {
	config := models.GetPlanConfig(models.PlanFree)
	allowed, _ := CanUseAI(models.PlanFree, 1, config.AILevel1Limit)
	if allowed {
		t.Error("expected blocked at limit")
	}
}

func TestCanUseAI_Unavailable(t *testing.T) {
	// Free plan has 0 for AI level 2
	allowed, _ := CanUseAI(models.PlanFree, 2, 0)
	if allowed {
		t.Error("expected blocked when AI level unavailable (limit=0)")
	}
}

func TestCanUseAI_Unlimited(t *testing.T) {
	// Team has unlimited AI level 1
	allowed, _ := CanUseAI(models.PlanTeam, 1, 9999)
	if !allowed {
		t.Error("expected allowed for unlimited AI level")
	}
}

func TestCanUseAI_InvalidLevel(t *testing.T) {
	allowed, _ := CanUseAI(models.PlanFree, 99, 0)
	if allowed {
		t.Error("expected blocked for invalid AI level")
	}
}

// --- CheckEntitlements ---

func TestCheckEntitlements_WithinLimits(t *testing.T) {
	usage := models.UsageSnapshot{
		CheckCount:      1,
		LogVolumeBytes:  1000,
		StatusPageCount: 0,
		APIKeyCount:     1,
		AILevel1Calls:   0,
		AILevel2Calls:   0,
		AILevel3Calls:   0,
	}
	result := CheckEntitlements(models.PlanTeam, usage)
	if !result.WithinLimits {
		t.Errorf("expected within limits, got violations: %+v", result.Violations)
	}
}

func TestCheckEntitlements_Violations(t *testing.T) {
	config := models.GetPlanConfig(models.PlanFree)
	usage := models.UsageSnapshot{
		CheckCount:     config.MaxChecks + 1,
		LogVolumeBytes: config.LogVolumeBytesPerMonth + 1,
		APIKeyCount:    config.MaxAPIKeys + 1,
	}
	result := CheckEntitlements(models.PlanFree, usage)
	if result.WithinLimits {
		t.Error("expected violations, got within limits")
	}
	if len(result.Violations) < 3 {
		t.Errorf("expected at least 3 violations, got %d: %+v", len(result.Violations), result.Violations)
	}
}

// --- EntitlementError ---

func TestEntitlementError_Shape(t *testing.T) {
	result := EntitlementError("test msg", "checks")
	if result["error"] != "test msg" {
		t.Errorf("error = %v, want %q", result["error"], "test msg")
	}
	if result["code"] != "ENTITLEMENT_LIMIT" {
		t.Errorf("code = %v, want ENTITLEMENT_LIMIT", result["code"])
	}
	if result["limit_type"] != "checks" {
		t.Errorf("limit_type = %v, want checks", result["limit_type"])
	}
	if result["upgrade_url"] != "/settings?tab=billing" {
		t.Errorf("upgrade_url = %v, want /settings?tab=billing", result["upgrade_url"])
	}
}
