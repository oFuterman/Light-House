package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type LogEvent struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`

	OrgID     uint      `gorm:"not null;index" json:"org_id"`
	Timestamp time.Time `gorm:"not null;index" json:"timestamp"`
	Message   string    `gorm:"not null;size:4096" json:"message"`
	Level     string    `gorm:"not null;size:20;default:'info'" json:"level"`
	Metadata  JSONMap   `gorm:"type:jsonb" json:"metadata,omitempty"`

	// Relations
	Organization Organization `gorm:"foreignKey:OrgID" json:"organization,omitempty"`
}

// JSONMap is a custom type for handling JSONB columns
type JSONMap map[string]interface{}

func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, j)
}
