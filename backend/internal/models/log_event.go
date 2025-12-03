package models

import (
    "database/sql/driver"
    "encoding/json"
    "errors"
    "time"
)

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

// LogEvent is the legacy simple log model (kept for backward compatibility)
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

// LogEntry is the enhanced structured log model for observability
type LogEntry struct {
    ID        uint      `gorm:"primarykey" json:"id"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
    OrgID       uint      `gorm:"not null;index:idx_log_entries_org_svc_level,priority:1" json:"org_id"`
    ServiceName string    `gorm:"size:255;index:idx_log_entries_org_svc_level,priority:2" json:"service_name"`
    Environment string    `gorm:"size:50;index:idx_log_entries_org_env" json:"environment"`
    Region      string    `gorm:"size:50" json:"region,omitempty"`
    Level       string    `gorm:"size:20;not null;index:idx_log_entries_org_svc_level,priority:3" json:"level"`
    Message     string    `gorm:"not null;size:8192" json:"message"`
    Timestamp   time.Time `gorm:"not null;index:idx_log_entries_org_svc_level,priority:4,sort:desc" json:"timestamp"`
    TraceID     string    `gorm:"size:64;index" json:"trace_id,omitempty"`
    SpanID      string    `gorm:"size:32" json:"span_id,omitempty"`
    Tags        JSONMap   `gorm:"type:jsonb" json:"tags,omitempty"`
    // Relations
    Organization Organization `gorm:"foreignKey:OrgID" json:"organization,omitempty"`
}
