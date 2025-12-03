package models

import (
    "time"
)

type CheckResult struct {
    ID        uint      `gorm:"primarykey" json:"id"`
    CreatedAt time.Time `json:"created_at" gorm:"index:idx_check_results_check_created,priority:2,sort:desc"`
    CheckID        uint   `gorm:"not null;index:idx_check_results_check_created,priority:1" json:"check_id"`
    StatusCode     int    `gorm:"index" json:"status_code"`
    ResponseTimeMs int64  `json:"response_time_ms"`
    Success        bool   `json:"success"`
    ErrorMessage   string `gorm:"size:1024" json:"error_message,omitempty"`
    // Observability fields (denormalized for efficient querying)
    OrgID       uint    `gorm:"index" json:"org_id"`
    ServiceName string  `gorm:"size:255;index" json:"service_name,omitempty"`
    Environment string  `gorm:"size:50;index" json:"environment,omitempty"`
    Region      string  `gorm:"size:50" json:"region,omitempty"`
    Tags        JSONMap `gorm:"type:jsonb" json:"tags,omitempty"`
    TraceID     string  `gorm:"size:64;index" json:"trace_id,omitempty"`
    // Relations
    Check Check `gorm:"foreignKey:CheckID" json:"check,omitempty"`
}
