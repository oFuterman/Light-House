package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lib/pq"
	"github.com/oFuterman/light-house/internal/billing"
	"github.com/oFuterman/light-house/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type CreateAPIKeyRequest struct {
	Name   string   `json:"name"`
	Scopes []string `json:"scopes"`
}

type APIKeyResponse struct {
	ID          uint       `json:"id"`
	Name        string     `json:"name"`
	Prefix      string     `json:"prefix"`
	Scopes      []string   `json:"scopes"`
	CreatedAt   time.Time  `json:"created_at"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
	CreatedBy   string     `json:"created_by,omitempty"`
}

type CreateAPIKeyResponse struct {
	APIKey APIKeyResponse `json:"api_key"`
	Key    string         `json:"key"` // Full key, only shown once
}

// generateAPIKey creates a cryptographically secure API key
func generateAPIKey() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "lh_" + hex.EncodeToString(bytes), nil
}

// ListAPIKeys returns all API keys for the current organization
func ListAPIKeys(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)

		var keys []models.APIKey
		if err := db.Preload("CreatedBy").Where("org_id = ?", orgID).Order("created_at DESC").Find(&keys).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to fetch API keys",
			})
		}

		responses := make([]APIKeyResponse, len(keys))
		for i, key := range keys {
			createdBy := ""
			if key.CreatedBy != nil {
				createdBy = key.CreatedBy.Email
			}
			responses[i] = APIKeyResponse{
				ID:         key.ID,
				Name:       key.Name,
				Prefix:     key.Prefix,
				Scopes:     key.Scopes,
				CreatedAt:  key.CreatedAt,
				LastUsedAt: key.LastUsedAt,
				CreatedBy:  createdBy,
			}
		}

		return c.JSON(fiber.Map{
			"api_keys": responses,
		})
	}
}

// CreateAPIKey creates a new API key
func CreateAPIKey(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		userID := c.Locals("userID").(uint)

		var req CreateAPIKeyRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "name is required",
			})
		}

		// Load org to get plan
		var org models.Organization
		if err := db.First(&org, orgID).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to load organization",
			})
		}

		// Check plan limits - can we create another API key?
		currentCount, err := billing.GetCurrentAPIKeyCount(db, orgID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to check limits",
			})
		}
		plan := billing.EffectivePlan(&org)
		if allowed, msg := billing.CanCreateAPIKey(plan, currentCount); !allowed {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":       msg,
				"limit_type":  "api_keys",
				"current":     currentCount,
				"upgrade_url": "/settings?tab=billing",
			})
		}

		// Validate scopes
		if len(req.Scopes) == 0 {
			req.Scopes = []string{string(models.ScopeLogsWrite)} // Default scope
		}
		for _, scope := range req.Scopes {
			if !models.IsValidScope(scope) {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "invalid scope: " + scope,
				})
			}
		}

		// Generate API key
		key, err := generateAPIKey()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to generate API key",
			})
		}

		// Hash the key for storage
		hashedKey, err := bcrypt.GenerateFromPassword([]byte(key), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to process API key",
			})
		}

		apiKey := models.APIKey{
			OrgID:       orgID,
			Name:        req.Name,
			KeyHash:     string(hashedKey),
			Prefix:      key[:12], // Store first 12 chars as prefix (includes "lh_")
			Scopes:      pq.StringArray(req.Scopes),
			CreatedByID: &userID,
		}

		if err := db.Create(&apiKey).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to create API key",
			})
		}

		// Sync usage counts after creating
		billing.SyncResourceCounts(db, orgID)

		// Log audit event
		logAuditEvent(db, orgID, &userID, models.AuditActionAPIKeyCreated, "apikey", &apiKey.ID, models.JSONMap{
			"name":   req.Name,
			"scopes": req.Scopes,
		}, c.IP(), c.Get("User-Agent"))

		return c.Status(fiber.StatusCreated).JSON(CreateAPIKeyResponse{
			APIKey: APIKeyResponse{
				ID:        apiKey.ID,
				Name:      apiKey.Name,
				Prefix:    apiKey.Prefix,
				Scopes:    apiKey.Scopes,
				CreatedAt: apiKey.CreatedAt,
			},
			Key: key, // Full key, only shown this once
		})
	}
}

// DeleteAPIKey deletes an API key
func DeleteAPIKey(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		userID := c.Locals("userID").(uint)

		keyID, err := strconv.ParseUint(c.Params("id"), 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid API key ID",
			})
		}

		// Find and delete API key
		var apiKey models.APIKey
		if err := db.Where("id = ? AND org_id = ?", keyID, orgID).First(&apiKey).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "API key not found",
			})
		}

		if err := db.Delete(&apiKey).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to delete API key",
			})
		}

		// Sync usage counts after deleting
		billing.SyncResourceCounts(db, orgID)

		// Log audit event
		logAuditEvent(db, orgID, &userID, models.AuditActionAPIKeyDeleted, "apikey", &apiKey.ID, models.JSONMap{
			"name": apiKey.Name,
		}, c.IP(), c.Get("User-Agent"))

		return c.JSON(fiber.Map{
			"message": "API key deleted successfully",
		})
	}
}
