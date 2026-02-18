package worker

import (
	"log"
	"time"

	"github.com/oFuterman/light-house/internal/models"
	"gorm.io/gorm"
)

// StartTrialExpiryWorker runs hourly to flip expired trials.
// This is a cleanup sweep — EffectivePlan and GetBilling already handle
// expired trials at request time. The worker ensures eventual consistency
// for orgs that never make another request after trial expiry.
func StartTrialExpiryWorker(db *gorm.DB) {
	log.Println("Starting trial expiry worker...")
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	// Run immediately on start, then every hour
	expireTrials(db)
	for range ticker.C {
		expireTrials(db)
	}
}

// expireTrials finds orgs with expired trials and downgrades them.
// Idempotent: the WHERE clause only matches is_trialing=true, so repeated
// runs or multiple instances are safe.
func expireTrials(db *gorm.DB) {
	var orgs []models.Organization
	err := db.Where("is_trialing = ? AND trial_end_at < ?", true, time.Now()).Find(&orgs).Error
	if err != nil {
		log.Printf("[Trial] Error fetching expired trials: %v", err)
		return
	}
	if len(orgs) == 0 {
		return
	}

	log.Printf("[Trial] Found %d expired trials to process", len(orgs))
	for _, org := range orgs {
		// Skip orgs that have an active paid subscription
		if org.StripeSubscriptionStatus != nil {
			s := *org.StripeSubscriptionStatus
			if s == "active" || s == "trialing" || s == "past_due" {
				// They converted — just clear the trial flag
				db.Model(&models.Organization{}).
					Where("id = ? AND is_trialing = ?", org.ID, true).
					Update("is_trialing", false)
				continue
			}
		}

		// Atomically downgrade — WHERE ensures idempotency
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
				Details:      models.JSONMap{"reason": "trial_expired_worker"},
			})
		}
	}
}
