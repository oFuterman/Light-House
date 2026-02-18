package models

import (
	"time"
)

// AuditAction represents the type of action being logged
type AuditAction string

const (
	// Auth actions
	AuditActionLogin        AuditAction = "auth.login"
	AuditActionLogout       AuditAction = "auth.logout"
	AuditActionLoginFailed  AuditAction = "auth.login_failed"
	AuditActionPasswordReset AuditAction = "auth.password_reset"

	// Organization actions
	AuditActionOrgCreated  AuditAction = "org.created"
	AuditActionOrgUpdated  AuditAction = "org.updated"
	AuditActionOrgDeleted  AuditAction = "org.deleted"

	// Member actions
	AuditActionMemberInvited   AuditAction = "member.invited"
	AuditActionMemberJoined    AuditAction = "member.joined"
	AuditActionMemberRemoved   AuditAction = "member.removed"
	AuditActionMemberRoleChanged AuditAction = "member.role_changed"
	AuditActionInviteRevoked   AuditAction = "member.invite_revoked"

	// API Key actions
	AuditActionAPIKeyCreated AuditAction = "apikey.created"
	AuditActionAPIKeyDeleted AuditAction = "apikey.deleted"

	// Check actions
	AuditActionCheckCreated AuditAction = "check.created"
	AuditActionCheckUpdated AuditAction = "check.updated"
	AuditActionCheckDeleted AuditAction = "check.deleted"

	// Settings actions
	AuditActionSettingsUpdated AuditAction = "settings.updated"

	// Billing/trial actions
	AuditActionTrialStarted   AuditAction = "billing.trial_started"
	AuditActionTrialExpired   AuditAction = "billing.trial_expired"
	AuditActionTrialConverted AuditAction = "billing.trial_converted"
)

// AuditLog records security-relevant events for compliance and debugging
type AuditLog struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at" gorm:"index:idx_audit_org_created,priority:2,sort:desc"`

	OrgID      uint        `gorm:"not null;index:idx_audit_org_created,priority:1" json:"org_id"`
	UserID     *uint       `gorm:"index" json:"user_id,omitempty"` // Nullable for system actions
	Action     AuditAction `gorm:"not null;size:50;index" json:"action"`
	ResourceType string    `gorm:"size:50" json:"resource_type,omitempty"` // e.g., "check", "apikey", "member"
	ResourceID   *uint     `json:"resource_id,omitempty"`
	Details    JSONMap     `gorm:"type:jsonb" json:"details,omitempty"` // Additional context
	IPAddress  string      `gorm:"size:45" json:"ip_address,omitempty"` // IPv4 or IPv6
	UserAgent  string      `gorm:"size:512" json:"user_agent,omitempty"`

	// Relations
	Organization Organization `gorm:"foreignKey:OrgID" json:"-"`
	User         *User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// AuditLogResponse is the DTO for returning audit logs
type AuditLogResponse struct {
	ID           uint        `json:"id"`
	CreatedAt    time.Time   `json:"created_at"`
	Action       AuditAction `json:"action"`
	ResourceType string      `json:"resource_type,omitempty"`
	ResourceID   *uint       `json:"resource_id,omitempty"`
	Details      JSONMap     `json:"details,omitempty"`
	IPAddress    string      `json:"ip_address,omitempty"`
	UserEmail    string      `json:"user_email,omitempty"`
}

// ToResponse converts AuditLog to AuditLogResponse
func (a *AuditLog) ToResponse() AuditLogResponse {
	response := AuditLogResponse{
		ID:           a.ID,
		CreatedAt:    a.CreatedAt,
		Action:       a.Action,
		ResourceType: a.ResourceType,
		ResourceID:   a.ResourceID,
		Details:      a.Details,
		IPAddress:    a.IPAddress,
	}
	if a.User != nil {
		response.UserEmail = a.User.Email
	}
	return response
}
