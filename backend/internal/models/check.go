package models

import (
	"time"

	"gorm.io/gorm"
)

type Check struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	OrgID           uint       `gorm:"not null;index" json:"org_id"`
	Name            string     `gorm:"not null;size:255" json:"name"`
	URL             string     `gorm:"not null;size:2048" json:"url"`
	IntervalSeconds int        `gorm:"not null;default:60" json:"interval_seconds"`
	LastStatus      *int       `json:"last_status"`
	LastCheckedAt   *time.Time `json:"last_checked_at"`
	LastAlertAt     *time.Time `json:"last_alert_at"`
	IsActive        bool       `gorm:"default:true" json:"is_active"`

	// Relations
	Organization Organization  `gorm:"foreignKey:OrgID" json:"organization,omitempty"`
	Results      []CheckResult `gorm:"foreignKey:CheckID" json:"results,omitempty"`
}
