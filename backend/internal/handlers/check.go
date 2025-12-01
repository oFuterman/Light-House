package handlers

import (
	"net/url"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/oFuterman/light-house/internal/models"
	"gorm.io/gorm"
)

type CreateCheckRequest struct {
	Name            string `json:"name"`
	URL             string `json:"url"`
	IntervalSeconds int    `json:"interval_seconds"`
}

type UpdateCheckRequest struct {
	Name            *string `json:"name,omitempty"`
	URL             *string `json:"url,omitempty"`
	IntervalSeconds *int    `json:"interval_seconds,omitempty"`
	IsActive        *bool   `json:"is_active,omitempty"`
}

// ListChecks returns all checks for the current organization
func ListChecks(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)

		var checks []models.Check
		if err := db.Where("org_id = ?", orgID).Order("created_at DESC").Find(&checks).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to fetch checks",
			})
		}

		return c.JSON(checks)
	}
}

// CreateCheck creates a new uptime check
func CreateCheck(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)

		var req CreateCheckRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		// Validate input
		req.Name = strings.TrimSpace(req.Name)
		req.URL = strings.TrimSpace(req.URL)

		if req.Name == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "name is required",
			})
		}

		if req.URL == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "url is required",
			})
		}

		// Validate URL format
		parsedURL, err := url.ParseRequestURI(req.URL)
		if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid URL format (must be http or https)",
			})
		}

		// Validate interval (minimum 60 seconds)
		if req.IntervalSeconds < 60 {
			req.IntervalSeconds = 60
		}

		check := models.Check{
			OrgID:           orgID,
			Name:            req.Name,
			URL:             req.URL,
			IntervalSeconds: req.IntervalSeconds,
			IsActive:        true,
		}

		if err := db.Create(&check).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to create check",
			})
		}

		return c.Status(fiber.StatusCreated).JSON(check)
	}
}

// GetCheck returns a single check by ID
func GetCheck(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		checkID, err := strconv.ParseUint(c.Params("id"), 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid check ID",
			})
		}

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

		return c.JSON(check)
	}
}

// UpdateCheck updates an existing check
func UpdateCheck(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		checkID, err := strconv.ParseUint(c.Params("id"), 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid check ID",
			})
		}

		// Find existing check
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

		var req UpdateCheckRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		// Apply updates
		if req.Name != nil {
			name := strings.TrimSpace(*req.Name)
			if name == "" {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "name cannot be empty",
				})
			}
			check.Name = name
		}

		if req.URL != nil {
			urlStr := strings.TrimSpace(*req.URL)
			parsedURL, err := url.ParseRequestURI(urlStr)
			if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "invalid URL format",
				})
			}
			check.URL = urlStr
		}

		if req.IntervalSeconds != nil {
			interval := *req.IntervalSeconds
			if interval < 60 {
				interval = 60
			}
			check.IntervalSeconds = interval
		}

		if req.IsActive != nil {
			check.IsActive = *req.IsActive
		}

		if err := db.Save(&check).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to update check",
			})
		}

		return c.JSON(check)
	}
}

// DeleteCheck soft-deletes a check
func DeleteCheck(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		checkID, err := strconv.ParseUint(c.Params("id"), 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid check ID",
			})
		}

		// Find and delete check (soft delete due to gorm.DeletedAt)
		result := db.Where("id = ? AND org_id = ?", checkID, orgID).Delete(&models.Check{})
		if result.Error != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to delete check",
			})
		}

		if result.RowsAffected == 0 {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "check not found",
			})
		}

		return c.JSON(fiber.Map{
			"message": "check deleted successfully",
		})
	}
}

// GetCheckResults returns the history of check results
func GetCheckResults(db *gorm.DB) fiber.Handler {
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

		// Get limit from query params (default 20, max 100)
		limit := 20
		if limitParam := c.Query("limit"); limitParam != "" {
			if l, err := strconv.Atoi(limitParam); err == nil && l > 0 {
				limit = l
				if limit > 100 {
					limit = 100
				}
			}
		}

		var results []models.CheckResult
		if err := db.Where("check_id = ?", checkID).
			Order("created_at DESC").
			Limit(limit).
			Find(&results).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to fetch results",
			})
		}

		return c.JSON(results)
	}
}
