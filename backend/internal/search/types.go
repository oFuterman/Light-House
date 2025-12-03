package search

import (
    "time"
)

// TimeRange represents a time window for filtering
type TimeRange struct {
    From *time.Time `json:"from,omitempty"`
    To   *time.Time `json:"to,omitempty"`
}

// FilterCondition represents a single filter condition
type FilterCondition struct {
    Field string      `json:"field"`
    Op    string      `json:"op"`
    Value interface{} `json:"value"`
}

// TagFilter represents a filter on JSONB tags
type TagFilter struct {
    Key   string `json:"key"`
    Op    string `json:"op"`
    Value string `json:"value"`
}

// SortField represents a sort directive
type SortField struct {
    Field string `json:"field"`
    Dir   string `json:"dir"` // "asc" or "desc"
}

// SearchRequest is the canonical filter DSL request structure
type SearchRequest struct {
    TimeRange *TimeRange        `json:"time_range,omitempty"`
    Filters   []FilterCondition `json:"filters,omitempty"`
    Tags      []TagFilter       `json:"tags,omitempty"`
    Sort      []SortField       `json:"sort,omitempty"`
    Limit     int               `json:"limit,omitempty"`
    Offset    int               `json:"offset,omitempty"`
}

// SearchResponse wraps search results with pagination metadata
type SearchResponse struct {
    Data   interface{} `json:"data"`
    Total  int64       `json:"total"`
    Limit  int         `json:"limit"`
    Offset int         `json:"offset"`
}

// Allowed operators
var AllowedOperators = map[string]bool{
    "=":        true,
    "eq":       true,
    "!=":       true,
    "ne":       true,
    "neq":      true,
    ">":        true,
    "gt":       true,
    "<":        true,
    "lt":       true,
    ">=":       true,
    "gte":      true,
    "<=":       true,
    "lte":      true,
    "in":       true,
    "contains": true,
    "prefix":   true,
}

// OperatorAliases maps common aliases to their canonical form
var OperatorAliases = map[string]string{
    "eq":  "=",
    "ne":  "!=",
    "neq": "!=",
    "gt":  ">",
    "lt":  "<",
    "gte": ">=",
    "lte": "<=",
}

// Allowed sort directions
var AllowedSortDirs = map[string]bool{
    "asc":  true,
    "desc": true,
}

// Resource-specific allowed fields
var ChecksAllowedFields = map[string]bool{
    "name":         true,
    "url":          true,
    "service_name": true,
    "environment":  true,
    "region":       true,
    "status_code":  true,
    "is_active":    true,
    "created_at":   true,
    "updated_at":   true,
}

var CheckResultsAllowedFields = map[string]bool{
    "check_id":         true,
    "service_name":     true,
    "environment":      true,
    "region":           true,
    "status_code":      true,
    "response_time_ms": true,
    "success":          true,
    "trace_id":         true,
    "created_at":       true,
}

var LogsAllowedFields = map[string]bool{
    "service_name": true,
    "environment":  true,
    "region":       true,
    "level":        true,
    "message":      true,
    "trace_id":     true,
    "span_id":      true,
    "timestamp":    true,
}

var TracesAllowedFields = map[string]bool{
    "service_name":   true,
    "environment":    true,
    "operation":      true,
    "status":         true,
    "duration_ms":    true,
    "trace_id":       true,
    "span_id":        true,
    "parent_span_id": true,
    "start_time":     true,
}

// Default and max limits
const (
    DefaultLimit = 100
    MaxLimit     = 1000
)
