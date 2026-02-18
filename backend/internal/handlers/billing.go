package handlers

import (
    "log"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/oFuterman/light-house/internal/billing"
    "github.com/oFuterman/light-house/internal/models"
    "gorm.io/gorm"
)

// BillingResponse is the response for GET /billing/me
type BillingResponse struct {
    Plan            string              `json:"plan"`
    PlanConfig      models.PlanConfig   `json:"plan_config"`
    Usage           models.UsageSnapshot `json:"usage"`
    Entitlements    billing.EntitlementResult `json:"entitlements"`
    SubscriptionStatus *string            `json:"subscription_status,omitempty"`
    CurrentPeriodEnd   *string            `json:"current_period_end,omitempty"`
    CancelAtPeriodEnd  bool               `json:"cancel_at_period_end"`
    IsTrialing         bool               `json:"is_trialing"`
    TrialEndAt         *string            `json:"trial_end_at,omitempty"`
    AvailablePlans     []PlanInfo         `json:"available_plans"`
}

// PlanInfo describes a plan for the UI
type PlanInfo struct {
    ID            string `json:"id"`
    Name          string `json:"name"`
    PriceCents    int    `json:"price_cents"`
    MaxChecks     int    `json:"max_checks"`
    LogRetention  int    `json:"log_retention_days"`
    LogVolumeGB   float64 `json:"log_volume_gb"`
    CheckInterval int    `json:"check_interval_seconds"`
    IsCurrent     bool   `json:"is_current"`
}

// GetBilling returns the current org's billing info
// GET /api/v1/billing/me
func GetBilling(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        // Load org with billing fields
        var org models.Organization
        if err := db.First(&org, orgID).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to load organization",
            })
        }
        // Request-time trial auto-downgrade: if trial expired and no active paid subscription,
        // atomically flip IsTrialing=false. The WHERE clause ensures idempotency and concurrency safety.
        if org.IsTrialing && org.TrialEndAt != nil && org.TrialEndAt.Before(time.Now()) {
            hasPaidSub := org.StripeSubscriptionStatus != nil &&
                (*org.StripeSubscriptionStatus == "active" || *org.StripeSubscriptionStatus == "trialing" || *org.StripeSubscriptionStatus == "past_due")
            if !hasPaidSub {
                result := db.Model(&models.Organization{}).
                    Where("id = ? AND is_trialing = ? AND trial_end_at < ?", org.ID, true, time.Now()).
                    Updates(map[string]interface{}{
                        "is_trialing": false,
                        "plan":        models.PlanFree,
                    })
                if result.RowsAffected > 0 {
                    log.Printf("[Trial] Auto-downgraded org %d after trial expiry", org.ID)
                    db.Create(&models.AuditLog{
                        OrgID:        org.ID,
                        Action:       models.AuditActionTrialExpired,
                        ResourceType: "organization",
                        ResourceID:   &org.ID,
                        Details:      models.JSONMap{"reason": "trial_expired_no_subscription"},
                    })
                    // Reload org to reflect the downgrade in the response
                    db.First(&org, orgID)
                }
            }
        }

        // Get usage snapshot
        usage, err := billing.GetUsageSnapshot(db, orgID)
        if err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to load usage",
            })
        }
        // Check entitlements using effective plan (trial-aware)
        plan := billing.EffectivePlan(&org)
        entitlements := billing.CheckEntitlements(plan, usage)
        // Build response
        resp := BillingResponse{
            Plan:              string(org.Plan),
            PlanConfig:        models.GetPlanConfig(plan),
            Usage:             usage,
            Entitlements:      entitlements,
            CancelAtPeriodEnd: org.CancelAtPeriodEnd,
            AvailablePlans:    buildPlanList(plan),
        }
        if org.StripeSubscriptionStatus != nil {
            resp.SubscriptionStatus = org.StripeSubscriptionStatus
        }
        if org.CurrentPeriodEnd != nil {
            formatted := org.CurrentPeriodEnd.Format("2006-01-02T15:04:05Z")
            resp.CurrentPeriodEnd = &formatted
        }
        resp.IsTrialing = org.IsTrialing
        if org.TrialEndAt != nil {
            formatted := org.TrialEndAt.Format("2006-01-02T15:04:05Z")
            resp.TrialEndAt = &formatted
        }
        return c.JSON(resp)
    }
}

// buildPlanList creates the list of available plans for the UI
func buildPlanList(currentPlan models.Plan) []PlanInfo {
    plans := []PlanInfo{}
    for _, plan := range []models.Plan{models.PlanFree, models.PlanIndiePro, models.PlanTeam, models.PlanAgency} {
        config := models.GetPlanConfig(plan)
        plans = append(plans, PlanInfo{
            ID:            string(plan),
            Name:          config.Name,
            PriceCents:    config.MonthlyPriceCents,
            MaxChecks:     config.MaxChecks,
            LogRetention:  config.LogRetentionDays,
            LogVolumeGB:   float64(config.LogVolumeBytesPerMonth) / (1024 * 1024 * 1024),
            CheckInterval: config.CheckIntervalMinSeconds,
            IsCurrent:     plan == currentPlan,
        })
    }
    return plans
}

// CreateCheckoutRequest is the request for creating a checkout session
type CreateCheckoutRequest struct {
    Plan string `json:"plan"`
}

// CreateCheckout creates a Stripe Checkout session for upgrading
// POST /api/v1/billing/checkout
func CreateCheckout(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        userID := c.Locals("userID").(uint)
        // Load org
        var org models.Organization
        if err := db.First(&org, orgID).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to load organization",
            })
        }
        // Load user for email
        var user models.User
        if err := db.First(&user, userID).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to load user",
            })
        }
        // Parse request
        var req CreateCheckoutRequest
        if err := c.BodyParser(&req); err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "invalid request body",
            })
        }
        // Validate plan
        targetPlan := models.Plan(req.Plan)
        if !targetPlan.IsValid() || !targetPlan.IsPaid() {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "invalid plan",
            })
        }
        // Create checkout session
        url, err := billing.CreateCheckoutSession(db, &org, user.Email, targetPlan)
        if err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to create checkout session",
            })
        }
        return c.JSON(fiber.Map{
            "checkout_url": url,
        })
    }
}

// CreatePortal creates a Stripe Billing Portal session
// POST /api/v1/billing/portal
func CreatePortal(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        // Load org
        var org models.Organization
        if err := db.First(&org, orgID).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to load organization",
            })
        }
        // Check if org has a Stripe customer
        if org.StripeCustomerID == nil || *org.StripeCustomerID == "" {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "no billing account found",
            })
        }
        // Create portal session
        url, err := billing.CreatePortalSession(&org)
        if err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to create portal session",
            })
        }
        return c.JSON(fiber.Map{
            "portal_url": url,
        })
    }
}

// HandleStripeWebhook processes incoming Stripe webhooks
// POST /api/v1/billing/webhook
func HandleStripeWebhook(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Read raw body
        payload := c.Body()
        signature := c.Get("Stripe-Signature")
        if signature == "" {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "missing Stripe-Signature header",
            })
        }
        // Process webhook
        if err := billing.HandleWebhook(db, payload, signature); err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": err.Error(),
            })
        }
        return c.JSON(fiber.Map{
            "received": true,
        })
    }
}

// GetUsage returns just the usage metrics for the current org
// GET /api/v1/billing/usage
func GetUsage(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        usage, err := billing.GetUsageSnapshot(db, orgID)
        if err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to load usage",
            })
        }
        return c.JSON(usage)
    }
}
