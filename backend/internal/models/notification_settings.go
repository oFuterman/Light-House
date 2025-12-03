package models

import (
    "time"

    "github.com/lib/pq"
)

type NotificationSettings struct {
    ID              uint           `gorm:"primarykey" json:"id"`
    CreatedAt       time.Time      `json:"created_at"`
    UpdatedAt       time.Time      `json:"updated_at"`
    OrgID           uint           `gorm:"uniqueIndex;not null" json:"org_id"`
    EmailRecipients pq.StringArray `gorm:"type:text[]" json:"email_recipients"`
    WebhookURL      *string        `gorm:"size:2048" json:"webhook_url,omitempty"`
    // Relations
    Organization Organization `gorm:"foreignKey:OrgID" json:"organization,omitempty"`
}
