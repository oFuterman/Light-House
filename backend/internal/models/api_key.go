package models

import (
	"time"

	"gorm.io/gorm"
)

type APIKey struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	OrgID   uint   `gorm:"not null;index" json:"org_id"`
	Name    string `gorm:"not null;size:255" json:"name"`
	KeyHash string `gorm:"not null;uniqueIndex" json:"-"`
	Prefix  string `gorm:"not null;size:12" json:"prefix"` // First 8 chars for identification

	// Relations
	Organization Organization `gorm:"foreignKey:OrgID" json:"organization,omitempty"`
}
