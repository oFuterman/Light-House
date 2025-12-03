package handlers

import (
    "strconv"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/oFuterman/light-house/internal/models"
    "gorm.io/gorm"
)

// AlertResponse is the DTO for alert API responses
type AlertResponse struct {
    ID           uint             `json:"id"`
    CreatedAt    time.Time        `json:"created_at"`
    CheckID      uint             `json:"check_id"`
    CheckName    string           `json:"check_name,omitempty"`
    AlertType    models.AlertType `json:"alert_type"`
    StatusCode   int              `json:"status_code"`
    ErrorMessage string           `json:"error_message,omitempty"`
}

// AlertsListResponse wraps the alerts array for consistent API responses
type AlertsListResponse struct {
    Alerts []AlertResponse `json:"alerts"`
}

// parseAlertQueryParams extracts limit and window_hours from query string
func parseAlertQueryParams(c *fiber.Ctx) (limit int, cutoff time.Time) {
    // Parse limit (default 50, max 200)
    limit = 50
    if limitParam := c.Query("limit"); limitParam != "" {
        if l, err := strconv.Atoi(limitParam); err == nil && l > 0 {
            limit = l
            if limit > 200 {
                limit = 200
            }
        }
    }
    // Parse window_hours (default 24)
    windowHours := 24
    if windowParam := c.Query("window_hours"); windowParam != "" {
        if w, err := strconv.Atoi(windowParam); err == nil && w > 0 {
            windowHours = w
        }
    }
    cutoff = time.Now().Add(-time.Duration(windowHours) * time.Hour)
    return limit, cutoff
}

// toAlertResponse converts a model to DTO
func toAlertResponse(alert models.Alert, checkName string) AlertResponse {
    return AlertResponse{
        ID:           alert.ID,
        CreatedAt:    alert.CreatedAt,
        CheckID:      alert.CheckID,
        CheckName:    checkName,
        AlertType:    alert.AlertType,
        StatusCode:   alert.StatusCode,
        ErrorMessage: alert.ErrorMessage,
    }
}

// GetCheckAlerts returns alerts for a specific check with time window filtering
func GetCheckAlerts(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        checkID, err := strconv.ParseUint(c.Params("id"), 10, 32)
        if err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "invalid check ID",
            })
        }
        // Verify the check belongs to this org
        var check models.Check
        if err := db.Where("id = ? AND org_id = ?", checkID, orgID).First(&check).Error; err != nil {
            if err == gorm.ErrRecordNotFound {
                return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
                    "error": "check not found",
                })
            }
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to fetch check",
            })
        }
        limit, cutoff := parseAlertQueryParams(c)
        // Query alerts for this check within time window
        var alerts []models.Alert
        if err := db.Where("check_id = ? AND created_at >= ?", checkID, cutoff).
            Order("created_at DESC").
            Limit(limit).
            Find(&alerts).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to fetch alerts",
            })
        }
        // Convert to response DTOs
        response := make([]AlertResponse, len(alerts))
        for i, alert := range alerts {
            response[i] = toAlertResponse(alert, check.Name)
        }
        return c.JSON(AlertsListResponse{Alerts: response})
    }
}

// GetOrgAlerts returns all alerts for the current organization
func GetOrgAlerts(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        limit, cutoff := parseAlertQueryParams(c)
        // Query alerts for this org within time window, preload check for name
        var alerts []models.Alert
        if err := db.Preload("Check").
            Where("org_id = ? AND created_at >= ?", orgID, cutoff).
            Order("created_at DESC").
            Limit(limit).
            Find(&alerts).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to fetch alerts",
            })
        }
        // Convert to response DTOs
        response := make([]AlertResponse, len(alerts))
        for i, alert := range alerts {
            checkName := ""
            if alert.Check.ID != 0 {
                checkName = alert.Check.Name
            }
            response[i] = toAlertResponse(alert, checkName)
        }
        return c.JSON(AlertsListResponse{Alerts: response})
    }
}
