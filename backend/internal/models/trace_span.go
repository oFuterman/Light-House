package models

import (
    "time"
)

// TraceSpan represents a single span in a distributed trace
type TraceSpan struct {
    ID        uint      `gorm:"primarykey" json:"id"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
    OrgID        uint      `gorm:"not null;index:idx_trace_spans_org_svc,priority:1" json:"org_id"`
    ServiceName  string    `gorm:"size:255;not null;index:idx_trace_spans_org_svc,priority:2" json:"service_name"`
    Environment  string    `gorm:"size:50;index" json:"environment,omitempty"`
    Operation    string    `gorm:"size:512;not null" json:"operation"`
    Status       string    `gorm:"size:20;not null;index:idx_trace_spans_org_svc,priority:3" json:"status"`
    DurationMs   int       `gorm:"not null" json:"duration_ms"`
    StartTime    time.Time `gorm:"not null;index:idx_trace_spans_org_svc,priority:4,sort:desc" json:"start_time"`
    TraceID      string    `gorm:"size:64;not null;index:idx_trace_spans_trace" json:"trace_id"`
    SpanID       string    `gorm:"size:32;not null" json:"span_id"`
    ParentSpanID string    `gorm:"size:32" json:"parent_span_id,omitempty"`
    Tags         JSONMap   `gorm:"type:jsonb" json:"tags,omitempty"`
    // Relations
    Organization Organization `gorm:"foreignKey:OrgID" json:"organization,omitempty"`
}

// TraceSpan status constants
const (
    SpanStatusOK      = "OK"
    SpanStatusError   = "ERROR"
    SpanStatusUnknown = "UNKNOWN"
)
