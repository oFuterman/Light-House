package handlers

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type CreateAPIKeyRequest struct {
	Name string `json:"name"`
}

// ListAPIKeys returns all API keys for the current organization
func ListAPIKeys(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Implement list API keys
		// 1. Get org from context
		// 2. Query API keys (only return prefix, not full key)
		// 3. Return API keys

		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
			"error": "not implemented",
		})
	}
}

// CreateAPIKey creates a new API key
func CreateAPIKey(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Implement create API key
		// 1. Parse request body
		// 2. Generate random API key
		// 3. Hash key for storage
		// 4. Store prefix + hash
		// 5. Return full key (only time it's shown)

		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
			"error": "not implemented",
		})
	}
}

// DeleteAPIKey deletes an API key
func DeleteAPIKey(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Implement delete API key
		// 1. Parse API key ID from params
		// 2. Verify org access
		// 3. Soft delete API key
		// 4. Return success

		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
			"error": "not implemented",
		})
	}
}
