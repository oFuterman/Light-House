package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/lib/pq"
	"github.com/oFuterman/light-house/internal/models"
	"github.com/oFuterman/light-house/internal/utils"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type SignupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	OrgName  string `json:"org_name"`
	Slug     string `json:"slug,omitempty"` // Optional custom slug
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  UserResponse `json:"user"`
}

type UserResponse struct {
	ID      uint        `json:"id"`
	Email   string      `json:"email"`
	OrgID   uint        `json:"org_id"`
	Role    models.Role `json:"role"`
	OrgName string      `json:"org_name,omitempty"`
	OrgSlug string      `json:"org_slug,omitempty"`
}

// JWTSecret is set by the router during initialization
var JWTSecret string

// Environment is set by the router during initialization ("development" or "production")
var Environment string

// setAuthCookie sets the JWT token as an HttpOnly cookie
func setAuthCookie(c *fiber.Ctx, token string) {
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    token,
		HTTPOnly: true,
		Secure:   Environment == "production",
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   86400, // 24 hours (matches JWT expiry)
	})
}

// clearAuthCookie removes the auth cookie
func clearAuthCookie(c *fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    "",
		HTTPOnly: true,
		Secure:   Environment == "production",
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   -1, // Delete cookie
	})
}

// Signup creates a new user and organization
func Signup(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req SignupRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		// Validate input
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))
		req.OrgName = strings.TrimSpace(req.OrgName)

		if req.Email == "" || req.Password == "" || req.OrgName == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "email, password, and org_name are required",
			})
		}

		if len(req.Password) < 8 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "password must be at least 8 characters",
			})
		}

		// Check if user already exists
		var existingUser models.User
		if err := db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "email already registered",
			})
		}

		// Check if org name is already taken (case-insensitive)
		if !utils.IsOrgNameAvailable(db, req.OrgName) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "an organization with this name already exists",
			})
		}

		// Hash password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to process password",
			})
		}

		// Determine the slug to use
		var finalSlug string
		req.Slug = strings.TrimSpace(req.Slug)

		if req.Slug != "" {
			// User provided a custom slug - validate it
			if err := utils.ValidateSlug(req.Slug); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": err.Error(),
				})
			}

			// Check availability before transaction (early fail)
			if !utils.IsSlugAvailable(db, req.Slug, nil) {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "this URL is already taken",
				})
			}

			finalSlug = req.Slug
		} else {
			// Auto-generate slug from org name
			baseSlug := utils.GenerateSlug(req.OrgName)
			if baseSlug == "" {
				baseSlug = "my-org" // B2 mitigation: fallback for empty/unicode names
			}

			// Handle reserved slugs
			if utils.IsReservedSlug(baseSlug) {
				baseSlug = baseSlug + "-org"
			}

			var err error
			finalSlug, err = utils.EnsureUniqueSlug(db, baseSlug, nil)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "failed to generate unique URL",
				})
			}
		}

		// Create organization and user in a transaction
		var user models.User
		var org models.Organization
		trialEnd := time.Now().Add(14 * 24 * time.Hour)
		err = db.Transaction(func(tx *gorm.DB) error {
			org = models.Organization{
				Name:       req.OrgName,
				Slug:       finalSlug,
				IsTrialing: true,
				TrialEndAt: &trialEnd,
			}
			if err := tx.Create(&org).Error; err != nil {
				return err
			}

			user = models.User{
				Email:        req.Email,
				PasswordHash: string(hashedPassword),
				OrgID:        org.ID,
				Role:         models.RoleOwner, // Founder is always owner
			}
			if err := tx.Create(&user).Error; err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			if pgErr, ok := err.(*pq.Error); ok && pgErr.Code == "23505" {
				if strings.Contains(pgErr.Constraint, "name") {
					return c.Status(fiber.StatusConflict).JSON(fiber.Map{
						"error": "an organization with this name already exists",
					})
				}
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "this URL is already taken",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to create account",
			})
		}

		// Log audit events for org creation and trial start
		logAuditEvent(db, user.OrgID, &user.ID, models.AuditActionOrgCreated, "organization", &user.OrgID, models.JSONMap{
			"org_name": req.OrgName,
			"email":    req.Email,
		}, c.IP(), c.Get("User-Agent"))
		logAuditEvent(db, user.OrgID, &user.ID, models.AuditActionTrialStarted, "organization", &user.OrgID, models.JSONMap{
			"trial_end_at": trialEnd.Format(time.RFC3339),
		}, c.IP(), c.Get("User-Agent"))

		// Generate JWT token with owner role
		token, err := generateTokenWithRole(user.ID, user.OrgID, user.Role)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to generate token",
			})
		}

		// Set auth cookie for browser clients
		setAuthCookie(c, token)

		return c.Status(fiber.StatusCreated).JSON(AuthResponse{
			Token: token,
			User: UserResponse{
				ID:      user.ID,
				Email:   user.Email,
				OrgID:   user.OrgID,
				Role:    user.Role,
				OrgName: org.Name,
				OrgSlug: org.Slug,
			},
		})
	}
}

// Login authenticates a user and returns a JWT token
func Login(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req LoginRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		req.Email = strings.TrimSpace(strings.ToLower(req.Email))

		if req.Email == "" || req.Password == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "email and password are required",
			})
		}

		// Find user by email with organization preloaded
		var user models.User
		if err := db.Preload("Organization").Where("email = ?", req.Email).First(&user).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid email or password",
			})
		}

		// Verify password
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			// Log failed login attempt
			logAuditEvent(db, user.OrgID, &user.ID, models.AuditActionLoginFailed, "user", &user.ID, models.JSONMap{
				"email": req.Email,
			}, c.IP(), c.Get("User-Agent"))
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid email or password",
			})
		}

		// Generate JWT token with role
		token, err := generateTokenWithRole(user.ID, user.OrgID, user.Role)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to generate token",
			})
		}

		// Set auth cookie for browser clients
		setAuthCookie(c, token)

		// Log successful login
		logAuditEvent(db, user.OrgID, &user.ID, models.AuditActionLogin, "user", &user.ID, models.JSONMap{
			"email": user.Email,
		}, c.IP(), c.Get("User-Agent"))

		return c.JSON(AuthResponse{
			Token: token,
			User: UserResponse{
				ID:      user.ID,
				Email:   user.Email,
				OrgID:   user.OrgID,
				Role:    user.Role,
				OrgName: user.Organization.Name,
				OrgSlug: user.Organization.Slug,
			},
		})
	}
}

// GetMe returns the current authenticated user
func GetMe(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID").(uint)

		var user models.User
		if err := db.Preload("Organization").First(&user, userID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "user not found",
			})
		}

		return c.JSON(fiber.Map{
			"id":       user.ID,
			"email":    user.Email,
			"org_id":   user.OrgID,
			"role":     user.Role,
			"org_name": user.Organization.Name,
			"org_slug": user.Organization.Slug,
		})
	}
}

// Logout invalidates the current session by clearing the auth cookie
func Logout(c *fiber.Ctx) error {
	clearAuthCookie(c)
	return c.JSON(fiber.Map{
		"message": "logged out successfully",
	})
}

// generateToken creates a new JWT token for the user
func generateToken(userID, orgID uint) (string, error) {
	return generateTokenWithRole(userID, orgID, models.RoleMember)
}

// generateTokenWithRole creates a new JWT token for the user with a specific role
func generateTokenWithRole(userID, orgID uint, role models.Role) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"org_id":  orgID,
		"role":    string(role),
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(JWTSecret))
}
