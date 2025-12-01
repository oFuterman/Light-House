package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/oFuterman/light-house/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type SignupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	OrgName  string `json:"org_name"`
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
	ID    uint   `json:"id"`
	Email string `json:"email"`
	OrgID uint   `json:"org_id"`
}

// JWTSecret is set by the router during initialization
var JWTSecret string

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

		// Hash password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to process password",
			})
		}

		// Create organization and user in a transaction
		var user models.User
		err = db.Transaction(func(tx *gorm.DB) error {
			org := models.Organization{
				Name: req.OrgName,
			}
			if err := tx.Create(&org).Error; err != nil {
				return err
			}

			user = models.User{
				Email:        req.Email,
				PasswordHash: string(hashedPassword),
				OrgID:        org.ID,
			}
			if err := tx.Create(&user).Error; err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to create account",
			})
		}

		// Generate JWT token
		token, err := generateToken(user.ID, user.OrgID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to generate token",
			})
		}

		return c.Status(fiber.StatusCreated).JSON(AuthResponse{
			Token: token,
			User: UserResponse{
				ID:    user.ID,
				Email: user.Email,
				OrgID: user.OrgID,
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

		// Find user by email
		var user models.User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid email or password",
			})
		}

		// Verify password
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid email or password",
			})
		}

		// Generate JWT token
		token, err := generateToken(user.ID, user.OrgID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to generate token",
			})
		}

		return c.JSON(AuthResponse{
			Token: token,
			User: UserResponse{
				ID:    user.ID,
				Email: user.Email,
				OrgID: user.OrgID,
			},
		})
	}
}

// GetMe returns the current authenticated user
func GetMe(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID").(uint)

		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "user not found",
			})
		}

		return c.JSON(UserResponse{
			ID:    user.ID,
			Email: user.Email,
			OrgID: user.OrgID,
		})
	}
}

// Logout invalidates the current session
func Logout(c *fiber.Ctx) error {
	// For JWT, logout is typically handled client-side by discarding the token
	// Server-side token blocklist could be implemented for enhanced security
	return c.JSON(fiber.Map{
		"message": "logged out successfully",
	})
}

// generateToken creates a new JWT token for the user
func generateToken(userID, orgID uint) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"org_id":  orgID,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(JWTSecret))
}
