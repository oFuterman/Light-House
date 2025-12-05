package router

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/oFuterman/light-house/internal/billing"
	"github.com/oFuterman/light-house/internal/config"
	"github.com/oFuterman/light-house/internal/handlers"
	"github.com/oFuterman/light-house/internal/middleware"
	"github.com/oFuterman/light-house/internal/models"
	"gorm.io/gorm"
)

func Setup(app *fiber.App, db *gorm.DB, cfg *config.Config) {
	// Initialize JWT secret and environment for handlers and middleware
	handlers.JWTSecret = cfg.JWTSecret
	handlers.Environment = cfg.Environment
	middleware.JWTSecret = cfg.JWTSecret

	// Initialize Stripe with configuration
	billing.InitStripe(billing.StripeConfig{
		SecretKey:       cfg.StripeSecretKey,
		WebhookSecret:   cfg.StripeWebhookSecret,
		SuccessURL:      cfg.FrontendURL + "/settings?tab=billing&checkout=success",
		CancelURL:       cfg.FrontendURL + "/settings?tab=billing",
		PortalReturnURL: cfg.FrontendURL + "/settings?tab=billing",
		IndiePriceID:    cfg.StripeIndiePriceID,
		TeamPriceID:     cfg.StripeTeamPriceID,
		AgencyPriceID:   cfg.StripeAgencyPriceID,
	})

	// Health check
	app.Get("/health", handlers.HealthCheck)

	// API v1
	v1 := app.Group("/api/v1")

	// Auth routes (public) with rate limiting
	auth := v1.Group("/auth", middleware.RateLimitAuth())
	auth.Post("/signup", handlers.Signup(db))
	auth.Post("/login", handlers.Login(db))
	auth.Post("/logout", handlers.Logout)

	// Slug suggestion and validation (public - used during signup)
	auth.Post("/suggest-slug", handlers.SuggestSlug(db))
	auth.Post("/check-slug", handlers.CheckSlug(db))

	// Invite routes (public - for accepting invites)
	v1.Get("/invites/:token", handlers.GetInviteInfo(db))
	v1.Post("/invites/:token/accept", middleware.RateLimitAuth(), handlers.AcceptInvite(db))

	// Log ingestion route (API key auth - must be registered before protected group)
	v1.Post("/logs",
		middleware.RateLimitByAPIKey(1000, time.Minute), // 1000 req/min per org
		middleware.APIKeyAuthWithScope(db, models.ScopeLogsWrite, models.ScopeAll),
		handlers.IngestLog(db),
	)

	// Stripe webhook (public, verified by signature - must be registered before protected group)
	v1.Post("/billing/webhook", handlers.HandleStripeWebhook(db))

	// Protected routes with fresh DB role fetch
	protected := v1.Group("", middleware.AuthRequiredWithDB(db))

	// Current user route
	protected.Get("/me", handlers.GetMe(db))

	// Organization routes
	orgs := protected.Group("/organizations")
	orgs.Get("/", handlers.ListOrganizations(db))
	orgs.Get("/:id", handlers.GetOrganization(db))
	orgs.Put("/:id", middleware.RequireAdmin(), handlers.UpdateOrganization(db))

	// Organization member routes
	members := protected.Group("/members")
	members.Get("/", handlers.ListMembers(db))
	members.Get("/:id", handlers.GetMember(db))
	members.Put("/:id/role", middleware.RequireAdmin(), handlers.UpdateMemberRole(db))
	members.Delete("/:id", middleware.RequireAdmin(), handlers.RemoveMember(db))
	members.Post("/:id/transfer-ownership", middleware.RequireOwner(), handlers.TransferOwnership(db))
	protected.Post("/leave", handlers.LeaveOrganization(db))

	// Invite routes (protected)
	invites := protected.Group("/invites", middleware.RequireAdmin())
	invites.Get("/", handlers.ListInvites(db))
	invites.Post("/", handlers.CreateInvite(db))
	invites.Delete("/:id", handlers.RevokeInvite(db))
	invites.Post("/:id/resend", handlers.ResendInvite(db))

	// Audit log routes
	protected.Get("/audit-logs", handlers.GetAuditLogs(db))
	protected.Get("/audit-logs/actions", handlers.GetAuditLogActions(db))

	// Check routes
	checks := protected.Group("/checks")
	checks.Get("/", handlers.ListChecks(db))
	checks.Post("/", handlers.CreateCheck(db))
	checks.Post("/search", handlers.SearchChecks(db))
	checks.Get("/:id", handlers.GetCheck(db))
	checks.Put("/:id", handlers.UpdateCheck(db))
	checks.Delete("/:id", handlers.DeleteCheck(db))
	checks.Get("/:id/results", handlers.GetCheckResults(db))
	checks.Post("/:id/results/search", handlers.SearchCheckResults(db))
	checks.Get("/:id/summary", handlers.GetCheckSummary(db))
	checks.Get("/:id/alerts", handlers.GetCheckAlerts(db))

	// Alert routes (org-wide)
	protected.Get("/alerts", handlers.GetOrgAlerts(db))

	// Notification settings routes (admin only)
	protected.Get("/notification-settings", handlers.GetNotificationSettings(db))
	protected.Put("/notification-settings", middleware.RequireAdmin(), handlers.UpdateNotificationSettings(db))

	// API Key routes (admin only for create/delete)
	apiKeys := protected.Group("/api-keys")
	apiKeys.Get("/", handlers.ListAPIKeys(db))
	apiKeys.Post("/", middleware.RequireAdmin(), handlers.CreateAPIKey(db))
	apiKeys.Delete("/:id", middleware.RequireAdmin(), handlers.DeleteAPIKey(db))

	// Billing routes
	billingRoutes := protected.Group("/billing")
	billingRoutes.Get("/me", handlers.GetBilling(db))
	billingRoutes.Get("/usage", handlers.GetUsage(db))
	billingRoutes.Post("/checkout", middleware.RequireOwner(), handlers.CreateCheckout(db))
	billingRoutes.Post("/portal", middleware.RequireOwner(), handlers.CreatePortal(db))

	// List logs route (JWT auth)
	protected.Get("/logs", handlers.ListLogs(db))

	// Search endpoints
	protected.Post("/logs/search", handlers.SearchLogs(db))
	protected.Get("/logs/facets", handlers.GetLogFacets(db))
	protected.Post("/traces/search", handlers.SearchTraces(db))

	// Debug endpoints (development only - handler checks Environment)
	debug := protected.Group("/debug")
	debug.Get("/entitlements", handlers.GetDebugEntitlements(db))
}
