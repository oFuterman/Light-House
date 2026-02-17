package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/oFuterman/light-house/internal/models"
	"gorm.io/gorm"
)

// logAuditEvent creates an audit log entry
func logAuditEvent(
	db *gorm.DB,
	orgID uint,
	userID *uint,
	action models.AuditAction,
	resourceType string,
	resourceID *uint,
	details models.JSONMap,
	ipAddress string,
	userAgent string,
) {
	auditLog := models.AuditLog{
		OrgID:        orgID,
		UserID:       userID,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Details:      details,
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
	}

	// Fire and forget - don't block the request
	go func() {
		db.Create(&auditLog)
	}()
}

// GetAuditLogs returns audit logs for the organization
func GetAuditLogs(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		userRole := c.Locals("role").(models.Role)

		// Only admins and owners can view audit logs
		if !userRole.CanManageSettings() {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "insufficient permissions to view audit logs",
			})
		}

		// Parse query parameters
		limit := 100
		if limitParam := c.Query("limit"); limitParam != "" {
			if l, err := strconv.Atoi(limitParam); err == nil && l > 0 {
				limit = l
				if limit > 500 {
					limit = 500
				}
			}
		}

		offset := 0
		if offsetParam := c.Query("offset"); offsetParam != "" {
			if o, err := strconv.Atoi(offsetParam); err == nil && o >= 0 {
				offset = o
			}
		}

		// Filter by action
		actionFilter := c.Query("action")

		// Filter by time range: explicit from/to or window_hours fallback
		var fromTime, toTime time.Time
		if fromParam := c.Query("from"); fromParam != "" {
			if t, err := time.Parse(time.RFC3339, fromParam); err == nil {
				fromTime = t
			}
		}
		if toParam := c.Query("to"); toParam != "" {
			if t, err := time.Parse(time.RFC3339, toParam); err == nil {
				toTime = t
			}
		}
		if fromTime.IsZero() {
			windowHours := 24
			if windowParam := c.Query("window_hours"); windowParam != "" {
				if w, err := strconv.Atoi(windowParam); err == nil && w > 0 {
					windowHours = w
				}
			}
			fromTime = time.Now().Add(-time.Duration(windowHours) * time.Hour)
		}

		// Build query
		query := db.Preload("User").Where("org_id = ? AND created_at >= ?", orgID, fromTime)
		if !toTime.IsZero() {
			query = query.Where("created_at <= ?", toTime)
		}

		if actionFilter != "" {
			query = query.Where("action = ?", actionFilter)
		}

		// Get total count
		var total int64
		query.Model(&models.AuditLog{}).Count(&total)

		// Get paginated results
		var logs []models.AuditLog
		if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&logs).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to fetch audit logs",
			})
		}

		// Convert to response DTOs
		responses := make([]models.AuditLogResponse, len(logs))
		for i, log := range logs {
			responses[i] = log.ToResponse()
		}

		return c.JSON(fiber.Map{
			"audit_logs": responses,
			"total":      total,
			"limit":      limit,
			"offset":     offset,
		})
	}
}

// GetAuditLogActions returns list of unique audit actions for filtering
func GetAuditLogActions(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		userRole := c.Locals("role").(models.Role)

		if !userRole.CanManageSettings() {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "insufficient permissions",
			})
		}

		var actions []string
		if err := db.Model(&models.AuditLog{}).
			Where("org_id = ?", orgID).
			Distinct("action").
			Pluck("action", &actions).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to fetch actions",
			})
		}

		return c.JSON(fiber.Map{
			"actions": actions,
		})
	}
}
