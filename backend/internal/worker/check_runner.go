package worker

import (
    "log"
    "net/http"
    "time"

    "github.com/oFuterman/light-house/internal/models"
    "github.com/oFuterman/light-house/internal/notifier"
    "gorm.io/gorm"
)

const alertSuppressionWindow = 15 * time.Minute

// AlertMetadata contains info needed for sending notifications
type AlertMetadata struct {
    Alert     models.Alert
    CheckName string
    CheckURL  string
    OrgID     uint
}

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

// isStatusUp returns true if status code indicates UP (2xx)
func isStatusUp(statusCode int) bool {
    return statusCode >= 200 && statusCode < 300
}

// shouldTriggerAlert determines if an alert should be created based on status transition and suppression window
func shouldTriggerAlert(prevStatus *int, newStatusCode int, lastAlertAt *time.Time) (shouldAlert bool, alertType models.AlertType) {
    newIsUp := isStatusUp(newStatusCode)
    // Determine previous state (nil = first check, treat as UP to avoid false DOWN alert)
    prevIsUp := true
    if prevStatus != nil {
        prevIsUp = isStatusUp(*prevStatus)
    }
    // No state change = no alert
    if prevIsUp == newIsUp {
        return false, ""
    }
    // Check suppression window
    if lastAlertAt != nil && time.Since(*lastAlertAt) < alertSuppressionWindow {
        return false, ""
    }
    // Determine alert type based on transition
    if prevIsUp && !newIsUp {
        return true, models.AlertTypeDown
    }
    if !prevIsUp && newIsUp {
        return true, models.AlertTypeRecovery
    }
    return false, ""
}

// createAlert inserts an alert and updates the check's LastAlertAt
func createAlert(db *gorm.DB, check models.Check, alertType models.AlertType, statusCode int, errorMsg string) *AlertMetadata {
    now := time.Now()
    alert := models.Alert{
        OrgID:        check.OrgID,
        CheckID:      check.ID,
        AlertType:    alertType,
        StatusCode:   statusCode,
        ErrorMessage: errorMsg,
    }
    if err := db.Create(&alert).Error; err != nil {
        log.Printf("Error creating alert for check %d: %v", check.ID, err)
        return nil
    }
    // Update check's LastAlertAt
    if err := db.Model(&models.Check{}).Where("id = ?", check.ID).Update("last_alert_at", now).Error; err != nil {
        log.Printf("Error updating LastAlertAt for check %d: %v", check.ID, err)
    }
    log.Printf("Alert created: check=%d type=%s status=%d", check.ID, alertType, statusCode)
    return &AlertMetadata{
        Alert:     alert,
        CheckName: check.Name,
        CheckURL:  check.URL,
        OrgID:     check.OrgID,
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
    var errorMsg string
    if err != nil {
        // Request failed
        result.Success = false
        result.StatusCode = 0
        result.ErrorMessage = err.Error()
        errorMsg = err.Error()
        log.Printf("Check %d (%s) failed: %v", check.ID, check.Name, err)
    } else {
        defer resp.Body.Close()
        result.StatusCode = resp.StatusCode
        result.Success = isStatusUp(resp.StatusCode)
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
    // Check if we should trigger an alert
    if shouldAlert, alertType := shouldTriggerAlert(check.LastStatus, result.StatusCode, check.LastAlertAt); shouldAlert {
        if metadata := createAlert(db, check, alertType, result.StatusCode, errorMsg); metadata != nil {
            go func() {
                if err := notifier.SendAllNotifications(db, metadata.Alert, check); err != nil {
                    log.Printf("Failed to send notifications for check %d: %v", check.ID, err)
                }
            }()
        }
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
