package models

import (
	"time"

	"gorm.io/gorm"
)

type Organization struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Name string `gorm:"not null;size:255" json:"name"`
	Slug string `gorm:"uniqueIndex;size:100" json:"slug"` // URL-friendly identifier

	// Billing & Subscription
	Plan                     Plan    `gorm:"size:20;default:'free'" json:"plan"`
	StripeCustomerID         *string `gorm:"size:255;index" json:"-"`
	StripeSubscriptionID     *string `gorm:"size:255" json:"-"`
	StripeSubscriptionStatus *string `gorm:"size:50" json:"-"` // active, past_due, canceled, etc.
	CurrentPeriodEnd         *time.Time `json:"-"`
	CancelAtPeriodEnd        bool    `gorm:"default:false" json:"-"`

	// Reverse Trial (prepared for future implementation)
	// When IsTrialing=true, org has full Team features until TrialEndAt
	// After trial ends, org downgrades to Free if no subscription
	TrialEndAt *time.Time `json:"-"`
	IsTrialing bool       `gorm:"default:false" json:"-"`

	// Add-ons (prepared for future implementation)
	// These extend the base plan limits when purchased
	ExtraLogBytes int64 `gorm:"default:0" json:"-"`
	ExtraChecks   int   `gorm:"default:0" json:"-"`

	// Relations
	Users   []User   `gorm:"foreignKey:OrgID" json:"users,omitempty"`
	Checks  []Check  `gorm:"foreignKey:OrgID" json:"checks,omitempty"`
	APIKeys []APIKey `gorm:"foreignKey:OrgID" json:"api_keys,omitempty"`
}
