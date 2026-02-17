package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/oFuterman/light-house/internal/utils"
	"gorm.io/gorm"
)

// SuggestSlugRequest is the request body for slug suggestions
type SuggestSlugRequest struct {
	OrgName string `json:"org_name"`
}

// SuggestSlugResponse contains the primary slug and alternatives
type SuggestSlugResponse struct {
	Primary      utils.SlugSuggestion   `json:"primary"`
	Alternatives []utils.SlugSuggestion `json:"alternatives"`
}

// SuggestSlug returns slug suggestions for an organization name
// POST /api/v1/auth/suggest-slug
func SuggestSlug(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req SuggestSlugRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		if req.OrgName == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "org_name is required",
			})
		}

		primary, alternatives := utils.GenerateSlugSuggestions(db, req.OrgName)

		return c.JSON(SuggestSlugResponse{
			Primary:      primary,
			Alternatives: alternatives,
		})
	}
}

// CheckSlugRequest is the request body for checking slug availability
type CheckSlugRequest struct {
	Slug string `json:"slug"`
}

// CheckSlugResponse contains slug validation and availability info
type CheckSlugResponse struct {
	Slug      string `json:"slug"`
	Available bool   `json:"available"`
	Valid     bool   `json:"valid"`
	Error     string `json:"error,omitempty"`
}

// CheckOrgNameRequest is the request body for checking org name availability
type CheckOrgNameRequest struct {
	Name string `json:"name"`
}

// CheckOrgName checks if an organization name is available (case-insensitive)
// POST /api/v1/auth/check-name
func CheckOrgName(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req CheckOrgNameRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		name := strings.TrimSpace(req.Name)
		if len(name) < 2 || len(name) > 100 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "name must be between 2 and 100 characters",
			})
		}

		available := utils.IsOrgNameAvailable(db, name)

		return c.JSON(fiber.Map{
			"name":      name,
			"available": available,
		})
	}
}

// CheckSlug validates and checks availability of a slug
// POST /api/v1/auth/check-slug
func CheckSlug(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req CheckSlugRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		response := CheckSlugResponse{
			Slug:      req.Slug,
			Available: false,
			Valid:     false,
		}

		// Validate slug format
		if err := utils.ValidateSlug(req.Slug); err != nil {
			response.Error = err.Error()
			return c.JSON(response)
		}

		response.Valid = true

		// Check availability
		response.Available = utils.IsSlugAvailable(db, req.Slug, nil)
		if !response.Available {
			response.Error = "this URL is already taken"
		}

		return c.JSON(response)
	}
}
