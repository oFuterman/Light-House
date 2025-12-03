package models

import (
    "time"
)

type AlertType string

const (
    AlertTypeDown     AlertType = "DOWN"
    AlertTypeRecovery AlertType = "RECOVERY"
)

type Alert struct {
    ID           uint      `gorm:"primarykey" json:"id"`
    CreatedAt    time.Time `json:"created_at" gorm:"index"`
    OrgID        uint      `gorm:"not null;index" json:"org_id"`
    CheckID      uint      `gorm:"not null;index:idx_alerts_check_created" json:"check_id"`
    AlertType    AlertType `gorm:"not null;size:20;index" json:"alert_type"`
    StatusCode   int       `json:"status_code"`
    ErrorMessage string    `gorm:"size:1024" json:"error_message,omitempty"`
    // Relations
    Organization Organization `gorm:"foreignKey:OrgID" json:"organization,omitempty"`
    Check        Check        `gorm:"foreignKey:CheckID" json:"check,omitempty"`
}
