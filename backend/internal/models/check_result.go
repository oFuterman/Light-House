package models

import (
	"time"
)

type CheckResult struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`

	CheckID        uint   `gorm:"not null;index" json:"check_id"`
	StatusCode     int    `json:"status_code"`
	ResponseTimeMs int64  `json:"response_time_ms"`
	Success        bool   `json:"success"`
	ErrorMessage   string `gorm:"size:1024" json:"error_message,omitempty"`

	// Relations
	Check Check `gorm:"foreignKey:CheckID" json:"check,omitempty"`
}
