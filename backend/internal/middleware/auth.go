package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/oFuterman/light-house/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// JWTSecret is set during router initialization
var JWTSecret string

// AuthRequired validates JWT tokens and sets user context
func AuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing authorization header",
			})
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid authorization header format",
			})
		}

		tokenString := parts[1]

		// Parse and validate token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.NewError(fiber.StatusUnauthorized, "invalid token signing method")
			}
			return []byte(JWTSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid token claims",
			})
		}

		// Get user_id and org_id from claims
		userIDFloat, ok := claims["user_id"].(float64)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid user_id in token",
			})
		}

		orgIDFloat, ok := claims["org_id"].(float64)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid org_id in token",
			})
		}

		// Set user info in context for handlers to use
		c.Locals("userID", uint(userIDFloat))
		c.Locals("orgID", uint(orgIDFloat))

		return c.Next()
	}
}

// APIKeyAuth validates API keys for log ingestion
func APIKeyAuth(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		apiKey := c.Get("X-API-Key")
		if apiKey == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing X-API-Key header",
			})
		}

		// Find API key by checking hash
		var keys []models.APIKey
		if err := db.Find(&keys).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to validate API key",
			})
		}

		var matchedKey *models.APIKey
		for _, key := range keys {
			if err := bcrypt.CompareHashAndPassword([]byte(key.KeyHash), []byte(apiKey)); err == nil {
				matchedKey = &key
				break
			}
		}

		if matchedKey == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid API key",
			})
		}

		// Set org context
		c.Locals("orgID", matchedKey.OrgID)

		return c.Next()
	}
}
