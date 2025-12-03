package search

import (
    "fmt"
    "strings"
    "time"
)

// ValidationError represents a validation error with field context
type ValidationError struct {
    Field   string
    Message string
}

func (e ValidationError) Error() string {
    if e.Field != "" {
        return fmt.Sprintf("%s: %s", e.Field, e.Message)
    }
    return e.Message
}

// validateCommon performs common validation for all search requests
func validateCommon(req *SearchRequest) error {
    // Validate and apply defaults for limit
    if req.Limit <= 0 {
        req.Limit = DefaultLimit
    }
    if req.Limit > MaxLimit {
        req.Limit = MaxLimit
    }
    // Validate offset
    if req.Offset < 0 {
        req.Offset = 0
    }
    // Validate time range
    if req.TimeRange != nil {
        if req.TimeRange.From != nil && req.TimeRange.To != nil {
            if req.TimeRange.From.After(*req.TimeRange.To) {
                return ValidationError{Field: "time_range", Message: "from must be before to"}
            }
        }
    }
    // Validate sort directions
    for i, s := range req.Sort {
        dir := strings.ToLower(s.Dir)
        if dir == "" {
            dir = "desc"
        }
        if !AllowedSortDirs[dir] {
            return ValidationError{
                Field:   fmt.Sprintf("sort[%d].dir", i),
                Message: fmt.Sprintf("invalid sort direction: %s", s.Dir),
            }
        }
        req.Sort[i].Dir = dir
    }
    // Validate operators
    for i, f := range req.Filters {
        if !AllowedOperators[f.Op] {
            return ValidationError{
                Field:   fmt.Sprintf("filters[%d].op", i),
                Message: fmt.Sprintf("invalid operator: %s", f.Op),
            }
        }
    }
    for i, t := range req.Tags {
        if !AllowedOperators[t.Op] {
            return ValidationError{
                Field:   fmt.Sprintf("tags[%d].op", i),
                Message: fmt.Sprintf("invalid operator: %s", t.Op),
            }
        }
        if t.Key == "" {
            return ValidationError{
                Field:   fmt.Sprintf("tags[%d].key", i),
                Message: "tag key is required",
            }
        }
    }
    return nil
}

// validateFields checks that all filter and sort fields are allowed
func validateFields(req *SearchRequest, allowedFields map[string]bool, resourceName string) error {
    for i, f := range req.Filters {
        if !allowedFields[f.Field] {
            return ValidationError{
                Field:   fmt.Sprintf("filters[%d].field", i),
                Message: fmt.Sprintf("field '%s' not allowed for %s search", f.Field, resourceName),
            }
        }
    }
    for i, s := range req.Sort {
        if !allowedFields[s.Field] {
            return ValidationError{
                Field:   fmt.Sprintf("sort[%d].field", i),
                Message: fmt.Sprintf("field '%s' not allowed for %s sorting", s.Field, resourceName),
            }
        }
    }
    return nil
}

// ValidateChecksSearch validates a search request for checks
func ValidateChecksSearch(req *SearchRequest) error {
    if err := validateCommon(req); err != nil {
        return err
    }
    return validateFields(req, ChecksAllowedFields, "checks")
}

// ValidateCheckResultsSearch validates a search request for check results
func ValidateCheckResultsSearch(req *SearchRequest) error {
    if err := validateCommon(req); err != nil {
        return err
    }
    return validateFields(req, CheckResultsAllowedFields, "check_results")
}

// ValidateLogsSearch validates a search request for logs
func ValidateLogsSearch(req *SearchRequest) error {
    if err := validateCommon(req); err != nil {
        return err
    }
    // Apply default time range for logs (last 24h if not specified)
    if req.TimeRange == nil {
        now := time.Now()
        from := now.Add(-24 * time.Hour)
        req.TimeRange = &TimeRange{From: &from, To: &now}
    }
    // Apply default sort (newest first)
    if len(req.Sort) == 0 {
        req.Sort = []SortField{{Field: "timestamp", Dir: "desc"}}
    }
    return validateFields(req, LogsAllowedFields, "logs")
}

// ValidateTracesSearch validates a search request for traces
func ValidateTracesSearch(req *SearchRequest) error {
    if err := validateCommon(req); err != nil {
        return err
    }
    // Apply default time range for traces (last 24h if not specified)
    if req.TimeRange == nil {
        now := time.Now()
        from := now.Add(-24 * time.Hour)
        req.TimeRange = &TimeRange{From: &from, To: &now}
    }
    // Apply default sort (newest first)
    if len(req.Sort) == 0 {
        req.Sort = []SortField{{Field: "start_time", Dir: "desc"}}
    }
    return validateFields(req, TracesAllowedFields, "traces")
}
