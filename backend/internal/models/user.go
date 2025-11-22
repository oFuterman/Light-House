package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Email        string `gorm:"uniqueIndex;not null;size:255" json:"email"`
	PasswordHash string `gorm:"not null" json:"-"`
	OrgID        uint   `gorm:"not null;index" json:"org_id"`

	// Relations
	Organization Organization `gorm:"foreignKey:OrgID" json:"organization,omitempty"`
}
