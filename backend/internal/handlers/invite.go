package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/oFuterman/light-house/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// CreateInviteRequest is the request body for creating an invite
type CreateInviteRequest struct {
	Email string      `json:"email"`
	Role  models.Role `json:"role"`
}

// InviteResponse is the response DTO for invites
type InviteResponse struct {
	ID          uint                 `json:"id"`
	Email       string               `json:"email"`
	Role        models.Role          `json:"role"`
	Status      models.InviteStatus  `json:"status"`
	ExpiresAt   time.Time            `json:"expires_at"`
	CreatedAt   time.Time            `json:"created_at"`
	InvitedBy   string               `json:"invited_by"`
	AcceptedAt  *time.Time           `json:"accepted_at,omitempty"`
}

// toInviteResponse converts an Invite model to InviteResponse
func toInviteResponse(invite models.Invite) InviteResponse {
	invitedByEmail := ""
	if invite.InvitedBy.ID != 0 {
		invitedByEmail = invite.InvitedBy.Email
	}
	return InviteResponse{
		ID:         invite.ID,
		Email:      invite.Email,
		Role:       invite.Role,
		Status:     invite.Status,
		ExpiresAt:  invite.ExpiresAt,
		CreatedAt:  invite.CreatedAt,
		InvitedBy:  invitedByEmail,
		AcceptedAt: invite.AcceptedAt,
	}
}

// CreateInvite creates a new organization invite
func CreateInvite(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		userID := c.Locals("userID").(uint)
		userRole := c.Locals("role").(models.Role)

		// Check permission
		if !userRole.CanManageMembers() {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "insufficient permissions to invite members",
			})
		}

		var req CreateInviteRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		// Validate email
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))
		if req.Email == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "email is required",
			})
		}

		// Validate role
		if !req.Role.IsValid() {
			req.Role = models.RoleMember
		}

		// Only owners can invite admins/owners
		if req.Role == models.RoleOwner && userRole != models.RoleOwner {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "only owners can invite new owners",
			})
		}
		if req.Role == models.RoleAdmin && userRole != models.RoleOwner {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "only owners can invite admins",
			})
		}

		// Check if user already exists in this org
		var existingUser models.User
		if err := db.Where("email = ? AND org_id = ?", req.Email, orgID).First(&existingUser).Error; err == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "user is already a member of this organization",
			})
		}

		// Check for existing pending invite
		var existingInvite models.Invite
		if err := db.Where("email = ? AND org_id = ? AND status = ?", req.Email, orgID, models.InviteStatusPending).First(&existingInvite).Error; err == nil {
			// Revoke old invite and create new one
			existingInvite.Status = models.InviteStatusRevoked
			db.Save(&existingInvite)
		}

		// Generate invite token
		token, err := models.GenerateInviteToken()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to generate invite token",
			})
		}

		invite := models.Invite{
			OrgID:       orgID,
			Email:       req.Email,
			Role:        req.Role,
			Token:       token,
			Status:      models.InviteStatusPending,
			ExpiresAt:   time.Now().Add(models.DefaultInviteExpiration()),
			InvitedByID: userID,
		}

		if err := db.Create(&invite).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to create invite",
			})
		}

		// Load inviter info
		db.Preload("InvitedBy").First(&invite, invite.ID)

		// Log audit event
		logAuditEvent(db, orgID, &userID, models.AuditActionMemberInvited, "invite", &invite.ID, models.JSONMap{
			"email": req.Email,
			"role":  string(req.Role),
		}, c.IP(), c.Get("User-Agent"))

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"invite":      toInviteResponse(invite),
			"invite_link": getInviteLink(token),
		})
	}
}

// ListInvites returns all invites for the organization
func ListInvites(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		userRole := c.Locals("role").(models.Role)

		// Only admins and owners can view invites
		if !userRole.CanManageMembers() {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "insufficient permissions",
			})
		}

		var invites []models.Invite
		if err := db.Preload("InvitedBy").Where("org_id = ?", orgID).Order("created_at DESC").Find(&invites).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to fetch invites",
			})
		}

		// Convert to response DTOs
		responses := make([]InviteResponse, len(invites))
		for i, invite := range invites {
			// Update status if expired
			if invite.Status == models.InviteStatusPending && invite.IsExpired() {
				invite.Status = models.InviteStatusExpired
				db.Save(&invite)
			}
			responses[i] = toInviteResponse(invite)
		}

		return c.JSON(fiber.Map{
			"invites": responses,
		})
	}
}

// RevokeInvite revokes a pending invite
func RevokeInvite(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		userID := c.Locals("userID").(uint)
		userRole := c.Locals("role").(models.Role)

		if !userRole.CanManageMembers() {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "insufficient permissions",
			})
		}

		inviteID := c.Params("id")

		var invite models.Invite
		if err := db.Where("id = ? AND org_id = ?", inviteID, orgID).First(&invite).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "invite not found",
			})
		}

		if invite.Status != models.InviteStatusPending {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "can only revoke pending invites",
			})
		}

		invite.Status = models.InviteStatusRevoked
		if err := db.Save(&invite).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to revoke invite",
			})
		}

		// Log audit event
		logAuditEvent(db, orgID, &userID, models.AuditActionInviteRevoked, "invite", &invite.ID, models.JSONMap{
			"email": invite.Email,
		}, c.IP(), c.Get("User-Agent"))

		return c.JSON(fiber.Map{
			"message": "invite revoked successfully",
		})
	}
}

// GetInviteInfo returns information about an invite (public endpoint)
func GetInviteInfo(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Params("token")

		var invite models.Invite
		if err := db.Preload("Organization").Where("token = ?", token).First(&invite).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "invite not found or expired",
			})
		}

		// Check if invite is usable
		if !invite.IsUsable() {
			status := "expired"
			if invite.Status != models.InviteStatusPending {
				status = string(invite.Status)
			}
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":  "invite is no longer valid",
				"status": status,
			})
		}

		return c.JSON(fiber.Map{
			"email":      invite.Email,
			"org_name":   invite.Organization.Name,
			"org_slug":   invite.Organization.Slug,
			"role":       invite.Role,
			"expires_at": invite.ExpiresAt,
		})
	}
}

// AcceptInviteRequest is the request body for accepting an invite
type AcceptInviteRequest struct {
	Password string `json:"password"`
}

// AcceptInvite accepts an invite and creates the user account
func AcceptInvite(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Params("token")

		var req AcceptInviteRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		if len(req.Password) < 8 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "password must be at least 8 characters",
			})
		}

		var invite models.Invite
		if err := db.Preload("Organization").Where("token = ?", token).First(&invite).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "invite not found",
			})
		}

		// Check if invite is usable
		if !invite.IsUsable() {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invite is no longer valid",
			})
		}

		// Check if user already exists (they might have account in another org)
		var existingUser models.User
		userExists := db.Where("email = ?", invite.Email).First(&existingUser).Error == nil

		if userExists {
			// User exists - check if they're already in this org
			if existingUser.OrgID == invite.OrgID {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "you are already a member of this organization",
				})
			}
			// For now, don't support multi-org users
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "email already registered with another organization",
			})
		}

		// Hash password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to process password",
			})
		}

		// Create user and update invite in a transaction
		var user models.User
		err = db.Transaction(func(tx *gorm.DB) error {
			user = models.User{
				Email:        invite.Email,
				PasswordHash: string(hashedPassword),
				OrgID:        invite.OrgID,
				Role:         invite.Role,
			}
			if err := tx.Create(&user).Error; err != nil {
				return err
			}

			now := time.Now()
			invite.Status = models.InviteStatusAccepted
			invite.AcceptedAt = &now
			if err := tx.Save(&invite).Error; err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to create account",
			})
		}

		// Log audit event
		logAuditEvent(db, invite.OrgID, &user.ID, models.AuditActionMemberJoined, "user", &user.ID, models.JSONMap{
			"email":     user.Email,
			"role":      string(user.Role),
			"invite_id": invite.ID,
		}, c.IP(), c.Get("User-Agent"))

		// Generate JWT token with the invited role
		jwtToken, err := generateTokenWithRole(user.ID, user.OrgID, user.Role)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to generate token",
			})
		}

		// Set auth cookie
		setAuthCookie(c, jwtToken)

		return c.Status(fiber.StatusCreated).JSON(AuthResponse{
			Token: jwtToken,
			User: UserResponse{
				ID:      user.ID,
				Email:   user.Email,
				OrgID:   user.OrgID,
				Role:    user.Role,
				OrgName: invite.Organization.Name,
				OrgSlug: invite.Organization.Slug,
			},
		})
	}
}

// ResendInvite resends an invite email
func ResendInvite(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		userRole := c.Locals("role").(models.Role)

		if !userRole.CanManageMembers() {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "insufficient permissions",
			})
		}

		inviteID := c.Params("id")

		var invite models.Invite
		if err := db.Where("id = ? AND org_id = ?", inviteID, orgID).First(&invite).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "invite not found",
			})
		}

		if invite.Status != models.InviteStatusPending {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "can only resend pending invites",
			})
		}

		// Generate new token and extend expiry
		newToken, err := models.GenerateInviteToken()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to generate new token",
			})
		}

		invite.Token = newToken
		invite.ExpiresAt = time.Now().Add(models.DefaultInviteExpiration())

		if err := db.Save(&invite).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to update invite",
			})
		}

		// TODO: Send email notification

		return c.JSON(fiber.Map{
			"message":     "invite resent successfully",
			"invite_link": getInviteLink(newToken),
		})
	}
}

// getInviteLink generates the frontend URL for accepting an invite
func getInviteLink(token string) string {
	// In production, this should be configurable
	return "/invite/" + token
}
