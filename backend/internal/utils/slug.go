package utils

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/oFuterman/light-house/internal/models"
	"gorm.io/gorm"
)

// ReservedSlugs that cannot be used (route conflicts)
// Mitigates: B5 - reserved slug collision
var ReservedSlugs = []string{
	"new", "api", "admin", "login", "signup", "invite",
	"settings", "org", "app", "auth", "billing", "webhook",
	"health", "debug", "static", "public", "assets",
}

// slugCleanRegex removes all non-alphanumeric characters except hyphens
var slugCleanRegex = regexp.MustCompile(`[^a-z0-9-]`)

// multiHyphenRegex collapses multiple consecutive hyphens
var multiHyphenRegex = regexp.MustCompile(`-+`)

// GenerateSlug converts an organization name to a URL-safe slug
// Mitigates: B1 (special chars), B8 (unicode)
// Examples:
//   - "Acme Corp!!" → "acme-corp"
//   - "My   Company" → "my-company"
//   - "Test @#$% Corp" → "test-corp"
//   - "日本語" → "" (caller handles fallback)
func GenerateSlug(name string) string {
	// 1. Trim and lowercase
	slug := strings.ToLower(strings.TrimSpace(name))

	// 2. Replace spaces and underscores with hyphens
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "_", "-")

	// 3. Remove all non-alphanumeric characters except hyphens
	slug = slugCleanRegex.ReplaceAllString(slug, "")

	// 4. Collapse multiple consecutive hyphens to single
	slug = multiHyphenRegex.ReplaceAllString(slug, "-")

	// 5. Trim leading and trailing hyphens
	slug = strings.Trim(slug, "-")

	return slug
}

// ValidateSlug validates that a slug is in the correct format
// Returns error if invalid
func ValidateSlug(slug string) error {
	if slug == "" {
		return fmt.Errorf("slug cannot be empty")
	}

	if len(slug) > 100 {
		return fmt.Errorf("slug cannot exceed 100 characters")
	}

	// Must be lowercase alphanumeric with hyphens only
	validSlug := regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	if !validSlug.MatchString(slug) {
		return fmt.Errorf("slug must contain only lowercase letters, numbers, and hyphens")
	}

	if IsReservedSlug(slug) {
		return fmt.Errorf("slug '%s' is reserved", slug)
	}

	return nil
}

// IsReservedSlug checks if a slug is in the reserved list
func IsReservedSlug(slug string) bool {
	for _, reserved := range ReservedSlugs {
		if slug == reserved {
			return true
		}
	}
	return false
}

// EnsureUniqueSlug ensures the slug is unique by appending -2, -3, etc. if needed
// Mitigates: B3 (race condition) - uses DB-level unique constraint + retry
// Parameters:
//   - db: database connection (can be a transaction)
//   - baseSlug: the initial slug to try
//   - excludeOrgID: optional org ID to exclude from uniqueness check (for updates)
//
// Returns: unique slug or error if unable to generate one
func EnsureUniqueSlug(db *gorm.DB, baseSlug string, excludeOrgID *uint) (string, error) {
	// Handle reserved slugs by appending "-org"
	if IsReservedSlug(baseSlug) {
		baseSlug = baseSlug + "-org"
	}

	// Try the base slug first
	if isSlugAvailable(db, baseSlug, excludeOrgID) {
		return baseSlug, nil
	}

	// Try with suffix -2, -3, etc. up to -100
	for i := 2; i <= 100; i++ {
		candidate := fmt.Sprintf("%s-%d", baseSlug, i)
		if isSlugAvailable(db, candidate, excludeOrgID) {
			return candidate, nil
		}
	}

	return "", fmt.Errorf("unable to generate unique slug for base '%s' after 100 attempts", baseSlug)
}

// IsSlugAvailable checks if a slug is available (not used by another org)
// Exported for use in slug suggestion endpoints
func IsSlugAvailable(db *gorm.DB, slug string, excludeOrgID *uint) bool {
	var count int64
	query := db.Model(&models.Organization{}).Where("slug = ?", slug)
	if excludeOrgID != nil {
		query = query.Where("id != ?", *excludeOrgID)
	}
	query.Count(&count)
	return count == 0
}

// isSlugAvailable is an internal alias for backwards compatibility
func isSlugAvailable(db *gorm.DB, slug string, excludeOrgID *uint) bool {
	return IsSlugAvailable(db, slug, excludeOrgID)
}

// SlugSuggestion represents a suggested slug with availability status
type SlugSuggestion struct {
	Slug      string `json:"slug"`
	Available bool   `json:"available"`
}

// GenerateSlugSuggestions creates creative slug suggestions based on org name
// Returns the primary slug and a list of alternatives
// Mitigates: S4 - ensures user always has options
func GenerateSlugSuggestions(db *gorm.DB, orgName string) (primary SlugSuggestion, alternatives []SlugSuggestion) {
	baseSlug := GenerateSlug(orgName)
	if baseSlug == "" {
		baseSlug = "my-org"
	}

	// Handle reserved slugs
	if IsReservedSlug(baseSlug) {
		baseSlug = baseSlug + "-org"
	}

	// Check primary slug availability
	primaryAvailable := IsSlugAvailable(db, baseSlug, nil)
	primary = SlugSuggestion{Slug: baseSlug, Available: primaryAvailable}

	// Generate alternatives
	alternatives = generateAlternatives(db, orgName, baseSlug)

	return primary, alternatives
}

// generateAlternatives creates creative slug alternatives
func generateAlternatives(db *gorm.DB, orgName, baseSlug string) []SlugSuggestion {
	var suggestions []SlugSuggestion
	seen := make(map[string]bool)
	seen[baseSlug] = true

	// Strategy 1: Add "hq" suffix (e.g., "bobsburgers" -> "bobsburgers-hq")
	addSuggestion := func(slug string) {
		if slug == "" || seen[slug] || IsReservedSlug(slug) {
			return
		}
		if err := ValidateSlug(slug); err != nil {
			return
		}
		seen[slug] = true
		suggestions = append(suggestions, SlugSuggestion{
			Slug:      slug,
			Available: IsSlugAvailable(db, slug, nil),
		})
	}

	// Common suffixes
	suffixes := []string{"hq", "team", "app", "io", "co", "inc"}
	for _, suffix := range suffixes {
		addSuggestion(baseSlug + "-" + suffix)
		if len(suggestions) >= 3 {
			break
		}
	}

	// Strategy 2: Hyphenate words if not already (e.g., "bobsburgers" -> "bobs-burgers")
	hyphenated := hyphenateSlug(orgName)
	if hyphenated != baseSlug && hyphenated != "" {
		addSuggestion(hyphenated)
	}

	// Strategy 3: Add numbers if needed
	for i := 2; i <= 5 && len(suggestions) < 5; i++ {
		addSuggestion(fmt.Sprintf("%s-%d", baseSlug, i))
	}

	// Ensure at least one available suggestion
	if len(suggestions) == 0 || !hasAvailable(suggestions) {
		for i := 2; i <= 100; i++ {
			candidate := fmt.Sprintf("%s-%d", baseSlug, i)
			if IsSlugAvailable(db, candidate, nil) {
				suggestions = append(suggestions, SlugSuggestion{
					Slug:      candidate,
					Available: true,
				})
				break
			}
		}
	}

	return suggestions
}

// hyphenateSlug tries to intelligently add hyphens between words
// e.g., "bobsburgers" -> "bobs-burgers" (if it detects capital letters in original)
func hyphenateSlug(orgName string) string {
	// If the original name has spaces, hyphens are already added by GenerateSlug
	if strings.Contains(orgName, " ") {
		return ""
	}

	// Try to detect CamelCase or mixed case
	var result strings.Builder
	name := strings.TrimSpace(orgName)

	for i, r := range name {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteRune('-')
		}
		result.WriteRune(r)
	}

	hyphenated := GenerateSlug(result.String())
	return hyphenated
}

// hasAvailable checks if any suggestion is available
func hasAvailable(suggestions []SlugSuggestion) bool {
	for _, s := range suggestions {
		if s.Available {
			return true
		}
	}
	return false
}
