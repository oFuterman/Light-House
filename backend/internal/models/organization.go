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

	// Relations
	Users   []User   `gorm:"foreignKey:OrgID" json:"users,omitempty"`
	Checks  []Check  `gorm:"foreignKey:OrgID" json:"checks,omitempty"`
	APIKeys []APIKey `gorm:"foreignKey:OrgID" json:"api_keys,omitempty"`
}
