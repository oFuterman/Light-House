package billing

import (
    "encoding/json"
    "errors"
    "fmt"
    "io"
    "log"
    "strconv"
    "time"
    "github.com/oFuterman/light-house/internal/models"
    "github.com/stripe/stripe-go/v84"
    "github.com/stripe/stripe-go/v84/billingportal/session"
    checkoutsession "github.com/stripe/stripe-go/v84/checkout/session"
    "github.com/stripe/stripe-go/v84/customer"
    "github.com/stripe/stripe-go/v84/webhook"
    "gorm.io/gorm"
)

// StripeConfig holds Stripe configuration
type StripeConfig struct {
    SecretKey          string
    WebhookSecret      string
    SuccessURL         string
    CancelURL          string
    PortalReturnURL    string
    IndiePriceID       string
    TeamPriceID        string
    AgencyPriceID      string
}

var config StripeConfig

// InitStripe initializes the Stripe client with configuration
func InitStripe(cfg StripeConfig) {
    config = cfg
    stripe.Key = cfg.SecretKey
    // Update plan configs with actual Stripe price IDs
    if cfg.IndiePriceID != "" {
        c := models.PlanConfigs[models.PlanIndiePro]
        c.StripePriceID = cfg.IndiePriceID
        models.PlanConfigs[models.PlanIndiePro] = c
    }
    if cfg.TeamPriceID != "" {
        c := models.PlanConfigs[models.PlanTeam]
        c.StripePriceID = cfg.TeamPriceID
        models.PlanConfigs[models.PlanTeam] = c
    }
    if cfg.AgencyPriceID != "" {
        c := models.PlanConfigs[models.PlanAgency]
        c.StripePriceID = cfg.AgencyPriceID
        models.PlanConfigs[models.PlanAgency] = c
    }
}

// EnsureCustomer creates a Stripe customer for the org if one doesn't exist
func EnsureCustomer(db *gorm.DB, org *models.Organization, email string) error {
    if org.StripeCustomerID != nil && *org.StripeCustomerID != "" {
        return nil // Already has a customer
    }
    params := &stripe.CustomerParams{
        Email: stripe.String(email),
        Name:  stripe.String(org.Name),
        Metadata: map[string]string{
            "org_id": strconv.FormatUint(uint64(org.ID), 10),
        },
    }
    cust, err := customer.New(params)
    if err != nil {
        return fmt.Errorf("failed to create Stripe customer: %w", err)
    }
    org.StripeCustomerID = &cust.ID
    return db.Model(org).Update("stripe_customer_id", cust.ID).Error
}

// CreateCheckoutSession creates a Stripe Checkout session for upgrading to a plan
func CreateCheckoutSession(db *gorm.DB, org *models.Organization, email string, targetPlan models.Plan) (string, error) {
    planConfig := models.GetPlanConfig(targetPlan)
    if planConfig.StripePriceID == "" {
        return "", errors.New("no Stripe price configured for this plan")
    }
    // Ensure customer exists
    if err := EnsureCustomer(db, org, email); err != nil {
        return "", err
    }
    params := &stripe.CheckoutSessionParams{
        Customer: org.StripeCustomerID,
        Mode:     stripe.String(string(stripe.CheckoutSessionModeSubscription)),
        LineItems: []*stripe.CheckoutSessionLineItemParams{
            {
                Price:    stripe.String(planConfig.StripePriceID),
                Quantity: stripe.Int64(1),
            },
        },
        SuccessURL: stripe.String(config.SuccessURL),
        CancelURL:  stripe.String(config.CancelURL),
        SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
            Metadata: map[string]string{
                "org_id": strconv.FormatUint(uint64(org.ID), 10),
                "plan":   string(targetPlan),
            },
        },
    }
    sess, err := checkoutsession.New(params)
    if err != nil {
        return "", fmt.Errorf("failed to create checkout session: %w", err)
    }
    return sess.URL, nil
}

// CreatePortalSession creates a Stripe Billing Portal session for subscription management
func CreatePortalSession(org *models.Organization) (string, error) {
    if org.StripeCustomerID == nil || *org.StripeCustomerID == "" {
        return "", errors.New("organization has no Stripe customer")
    }
    params := &stripe.BillingPortalSessionParams{
        Customer:  org.StripeCustomerID,
        ReturnURL: stripe.String(config.PortalReturnURL),
    }
    sess, err := session.New(params)
    if err != nil {
        return "", fmt.Errorf("failed to create portal session: %w", err)
    }
    return sess.URL, nil
}

// HandleWebhook processes incoming Stripe webhooks
// Returns nil if handled successfully, error otherwise
func HandleWebhook(db *gorm.DB, payload []byte, signature string) error {
    event, err := webhook.ConstructEvent(payload, signature, config.WebhookSecret)
    if err != nil {
        return fmt.Errorf("webhook signature verification failed: %w", err)
    }
    log.Printf("[Stripe] Received webhook: %s", event.Type)
    switch event.Type {
    case "checkout.session.completed":
        return handleCheckoutCompleted(db, event)
    case "customer.subscription.created":
        return handleSubscriptionCreated(db, event)
    case "customer.subscription.updated":
        return handleSubscriptionUpdated(db, event)
    case "customer.subscription.deleted":
        return handleSubscriptionDeleted(db, event)
    case "invoice.payment_failed":
        return handlePaymentFailed(db, event)
    case "invoice.paid":
        return handleInvoicePaid(db, event)
    default:
        log.Printf("[Stripe] Unhandled event type: %s", event.Type)
    }
    return nil
}

// handleCheckoutCompleted processes successful checkout completions
func handleCheckoutCompleted(db *gorm.DB, event stripe.Event) error {
    var sess stripe.CheckoutSession
    if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
        return err
    }
    // The subscription webhooks will handle the actual plan update
    log.Printf("[Stripe] Checkout completed for customer: %s, subscription: %s",
        sess.Customer.ID, sess.Subscription.ID)
    return nil
}

// handleSubscriptionCreated processes new subscription creations
func handleSubscriptionCreated(db *gorm.DB, event stripe.Event) error {
    var sub stripe.Subscription
    if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
        return err
    }
    return updateOrgFromSubscription(db, &sub)
}

// handleSubscriptionUpdated processes subscription updates (plan changes, status changes)
func handleSubscriptionUpdated(db *gorm.DB, event stripe.Event) error {
    var sub stripe.Subscription
    if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
        return err
    }
    return updateOrgFromSubscription(db, &sub)
}

// handleSubscriptionDeleted processes subscription cancellations
func handleSubscriptionDeleted(db *gorm.DB, event stripe.Event) error {
    var sub stripe.Subscription
    if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
        return err
    }
    // Find org by Stripe subscription ID
    var org models.Organization
    if err := db.Where("stripe_subscription_id = ?", sub.ID).First(&org).Error; err != nil {
        // Try by customer ID
        if err := db.Where("stripe_customer_id = ?", sub.Customer.ID).First(&org).Error; err != nil {
            log.Printf("[Stripe] Could not find org for deleted subscription: %s", sub.ID)
            return nil // Don't error, might be a test subscription
        }
    }
    // Downgrade to free - NEVER delete data, NEVER lock out
    log.Printf("[Stripe] Subscription deleted for org %d, downgrading to free", org.ID)
    status := string(sub.Status)
    return db.Model(&org).Updates(map[string]interface{}{
        "plan":                       models.PlanFree,
        "stripe_subscription_id":     nil,
        "stripe_subscription_status": &status,
        "current_period_end":         nil,
        "cancel_at_period_end":       false,
    }).Error
}

// handlePaymentFailed processes failed payment attempts
func handlePaymentFailed(db *gorm.DB, event stripe.Event) error {
    var invoice stripe.Invoice
    if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
        return err
    }
    if invoice.Parent == nil || invoice.Parent.SubscriptionDetails == nil || invoice.Parent.SubscriptionDetails.Subscription == nil {
        return nil // Not a subscription invoice
    }
    sub := invoice.Parent.SubscriptionDetails.Subscription
    // Find org by subscription ID
    var org models.Organization
    if err := db.Where("stripe_subscription_id = ?", sub.ID).First(&org).Error; err != nil {
        log.Printf("[Stripe] Could not find org for failed payment: subscription %s", sub.ID)
        return nil
    }
    // Update status to past_due - user still has access during grace period
    // Stripe will retry and eventually cancel if payments keep failing
    log.Printf("[Stripe] Payment failed for org %d, marking as past_due", org.ID)
    status := "past_due"
    return db.Model(&org).Update("stripe_subscription_status", &status).Error
}

// handleInvoicePaid processes successful invoice payments
func handleInvoicePaid(db *gorm.DB, event stripe.Event) error {
    var invoice stripe.Invoice
    if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
        return err
    }
    if invoice.Parent == nil || invoice.Parent.SubscriptionDetails == nil || invoice.Parent.SubscriptionDetails.Subscription == nil {
        return nil
    }
    sub := invoice.Parent.SubscriptionDetails.Subscription
    // Find org by subscription ID
    var org models.Organization
    if err := db.Where("stripe_subscription_id = ?", sub.ID).First(&org).Error; err != nil {
        return nil
    }
    // Clear past_due status if payment succeeded
    if org.StripeSubscriptionStatus != nil && *org.StripeSubscriptionStatus == "past_due" {
        log.Printf("[Stripe] Payment succeeded for org %d, clearing past_due status", org.ID)
        status := "active"
        return db.Model(&org).Update("stripe_subscription_status", &status).Error
    }
    return nil
}

// updateOrgFromSubscription syncs org billing fields from a Stripe subscription
func updateOrgFromSubscription(db *gorm.DB, sub *stripe.Subscription) error {
    // Find org by customer ID
    var org models.Organization
    if err := db.Where("stripe_customer_id = ?", sub.Customer.ID).First(&org).Error; err != nil {
        log.Printf("[Stripe] Could not find org for customer: %s", sub.Customer.ID)
        return nil // Don't error on unknown customers
    }
    // Determine plan from subscription metadata or price ID
    var plan models.Plan = models.PlanFree
    if planStr, ok := sub.Metadata["plan"]; ok {
        plan = models.Plan(planStr)
    } else if len(sub.Items.Data) > 0 {
        priceID := sub.Items.Data[0].Price.ID
        if p, found := models.GetPlanByStripePriceID(priceID); found {
            plan = p
        }
    }
    // Build updates
    updates := map[string]interface{}{
        "stripe_subscription_id":     sub.ID,
        "stripe_subscription_status": string(sub.Status),
        "cancel_at_period_end":       sub.CancelAtPeriodEnd,
    }
    // Update period end (moved from Subscription to SubscriptionItem in API v2025-11-17)
    if len(sub.Items.Data) > 0 && sub.Items.Data[0].CurrentPeriodEnd > 0 {
        periodEnd := time.Unix(sub.Items.Data[0].CurrentPeriodEnd, 0)
        updates["current_period_end"] = periodEnd
    }
    // Only update plan if subscription is active or trialing
    if sub.Status == stripe.SubscriptionStatusActive || sub.Status == stripe.SubscriptionStatusTrialing {
        updates["plan"] = plan
    }
    // If subscription is canceled at period end, keep current plan until then
    // If status is canceled, downgrade to free
    if sub.Status == stripe.SubscriptionStatusCanceled {
        updates["plan"] = models.PlanFree
    }
    log.Printf("[Stripe] Updating org %d: plan=%s, status=%s, cancel_at_period_end=%v",
        org.ID, plan, sub.Status, sub.CancelAtPeriodEnd)
    return db.Model(&org).Updates(updates).Error
}

// ReadBody is a helper to read request body for webhooks
func ReadBody(body io.Reader) ([]byte, error) {
    return io.ReadAll(body)
}
