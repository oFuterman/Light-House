package handlers

import (
	"github.com/gofiber/fiber/v2"
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
		// TODO: Implement list checks
		// 1. Get org from context
		// 2. Query checks with last status
		// 3. Return checks

		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
			"error": "not implemented",
		})
	}
}

// CreateCheck creates a new uptime check
func CreateCheck(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Implement create check
		// 1. Parse request body
		// 2. Validate input (URL format, interval >= 60)
		// 3. Get org from context
		// 4. Create check
		// 5. Return created check

		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
			"error": "not implemented",
		})
	}
}

// GetCheck returns a single check by ID
func GetCheck(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Implement get check
		// 1. Parse check ID from params
		// 2. Verify org access
		// 3. Return check with recent results

		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
			"error": "not implemented",
		})
	}
}

// UpdateCheck updates an existing check
func UpdateCheck(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Implement update check
		// 1. Parse check ID from params
		// 2. Parse request body
		// 3. Verify org access
		// 4. Update check
		// 5. Return updated check

		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
			"error": "not implemented",
		})
	}
}

// DeleteCheck soft-deletes a check
func DeleteCheck(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Implement delete check
		// 1. Parse check ID from params
		// 2. Verify org access
		// 3. Soft delete check
		// 4. Return success

		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
			"error": "not implemented",
		})
	}
}

// GetCheckResults returns the history of check results
func GetCheckResults(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Implement get check results
		// 1. Parse check ID from params
		// 2. Verify org access
		// 3. Query last 20 results
		// 4. Return results

		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
			"error": "not implemented",
		})
	}
}
