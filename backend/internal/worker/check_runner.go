package worker

import (
	"log"
	"net/http"
	"time"

	"github.com/omerfuterman/basic-beacon/internal/models"
	"gorm.io/gorm"
)

// StartCheckRunner starts the background worker that runs uptime checks
func StartCheckRunner(db *gorm.DB) {
	log.Println("Starting check runner worker...")

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Run immediately on start, then every 30 seconds
	runDueChecks(db)

	for range ticker.C {
		runDueChecks(db)
	}
}

// runDueChecks finds and executes all checks that are due
func runDueChecks(db *gorm.DB) {
	var checks []models.Check

	// Find active checks that are due
	// A check is due if:
	// - last_checked_at is NULL (never run), OR
	// - last_checked_at + interval_seconds <= now
	err := db.Where("is_active = ?", true).
		Where("last_checked_at IS NULL OR last_checked_at + (interval_seconds * interval '1 second') <= ?", time.Now()).
		Find(&checks).Error

	if err != nil {
		log.Printf("Error fetching due checks: %v", err)
		return
	}

	if len(checks) == 0 {
		return
	}

	log.Printf("Running %d due checks", len(checks))

	for _, check := range checks {
		go runCheck(db, check)
	}
}

// runCheck executes a single HTTP check and stores the result
func runCheck(db *gorm.DB, check models.Check) {
	startTime := time.Now()

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Allow up to 10 redirects
			if len(via) >= 10 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}

	// Make the request
	resp, err := client.Get(check.URL)

	responseTime := time.Since(startTime).Milliseconds()
	now := time.Now()

	result := models.CheckResult{
		CheckID:        check.ID,
		ResponseTimeMs: responseTime,
	}

	if err != nil {
		// Request failed
		result.Success = false
		result.StatusCode = 0
		result.ErrorMessage = err.Error()

		log.Printf("Check %d (%s) failed: %v", check.ID, check.Name, err)
	} else {
		defer resp.Body.Close()

		result.StatusCode = resp.StatusCode
		result.Success = resp.StatusCode >= 200 && resp.StatusCode < 300

		if result.Success {
			log.Printf("Check %d (%s) succeeded: %d in %dms", check.ID, check.Name, resp.StatusCode, responseTime)
		} else {
			log.Printf("Check %d (%s) returned: %d in %dms", check.ID, check.Name, resp.StatusCode, responseTime)
		}
	}

	// Store the result
	if err := db.Create(&result).Error; err != nil {
		log.Printf("Error storing result for check %d: %v", check.ID, err)
		return
	}

	// Update the check's last status and last_checked_at
	updates := map[string]interface{}{
		"last_status":     result.StatusCode,
		"last_checked_at": now,
	}

	if err := db.Model(&models.Check{}).Where("id = ?", check.ID).Updates(updates).Error; err != nil {
		log.Printf("Error updating check %d status: %v", check.ID, err)
	}
}
