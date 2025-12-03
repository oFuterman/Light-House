package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/oFuterman/light-house/internal/config"
	"github.com/oFuterman/light-house/internal/handlers"
	"github.com/oFuterman/light-house/internal/middleware"
	"gorm.io/gorm"
)

func Setup(app *fiber.App, db *gorm.DB, cfg *config.Config) {
	// Initialize JWT secret for handlers and middleware
	handlers.JWTSecret = cfg.JWTSecret
	middleware.JWTSecret = cfg.JWTSecret

	// Health check
	app.Get("/health", handlers.HealthCheck)

	// API v1
	v1 := app.Group("/api/v1")

	// Auth routes (public)
	auth := v1.Group("/auth")
	auth.Post("/signup", handlers.Signup(db))
	auth.Post("/login", handlers.Login(db))
	auth.Post("/logout", handlers.Logout)

	// Protected routes
	protected := v1.Group("", middleware.AuthRequired())

	// Current user route
	protected.Get("/me", handlers.GetMe(db))

	// Organization routes
	orgs := protected.Group("/organizations")
	orgs.Get("/", handlers.ListOrganizations(db))
	orgs.Get("/:id", handlers.GetOrganization(db))
	orgs.Put("/:id", handlers.UpdateOrganization(db))

	// Check routes
	checks := protected.Group("/checks")
	checks.Get("/", handlers.ListChecks(db))
	checks.Post("/", handlers.CreateCheck(db))
	checks.Get("/:id", handlers.GetCheck(db))
	checks.Put("/:id", handlers.UpdateCheck(db))
	checks.Delete("/:id", handlers.DeleteCheck(db))
	checks.Get("/:id/results", handlers.GetCheckResults(db))
	checks.Get("/:id/summary", handlers.GetCheckSummary(db))
	checks.Get("/:id/alerts", handlers.GetCheckAlerts(db))

	// Alert routes (org-wide)
	protected.Get("/alerts", handlers.GetOrgAlerts(db))

	// Notification settings routes
	protected.Get("/notification-settings", handlers.GetNotificationSettings(db))
	protected.Put("/notification-settings", handlers.UpdateNotificationSettings(db))

	// API Key routes
	apiKeys := protected.Group("/api-keys")
	apiKeys.Get("/", handlers.ListAPIKeys(db))
	apiKeys.Post("/", handlers.CreateAPIKey(db))
	apiKeys.Delete("/:id", handlers.DeleteAPIKey(db))

	// Log ingestion (API key auth)
	v1.Post("/logs", middleware.APIKeyAuth(db), handlers.IngestLog(db))
	v1.Get("/logs", middleware.AuthRequired(), handlers.ListLogs(db))
}
