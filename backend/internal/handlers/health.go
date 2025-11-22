package handlers

import "github.com/gofiber/fiber/v2"

// HealthCheck returns the health status of the service
func HealthCheck(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "healthy",
	})
}
