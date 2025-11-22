package middleware

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// AuthRequired validates JWT tokens and sets user context
func AuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Implement JWT validation
		// 1. Extract token from Authorization header
		// 2. Validate token
		// 3. Set user info in context

		// Placeholder: allow all requests for now
		return c.Next()
	}
}

// APIKeyAuth validates API keys for log ingestion
func APIKeyAuth(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Implement API key validation
		// 1. Extract API key from X-API-Key header
		// 2. Hash and lookup in database
		// 3. Set org context

		// Placeholder: allow all requests for now
		return c.Next()
	}
}
