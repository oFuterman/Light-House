package handlers

import (
    "time"
    "github.com/gofiber/fiber/v2"
    "github.com/oFuterman/light-house/internal/models"
    "github.com/oFuterman/light-house/internal/search"
    "gorm.io/gorm"
)

// CheckSearchDTO is the response DTO for check search results
type CheckSearchDTO struct {
    ID              uint       `json:"id"`
    Name            string     `json:"name"`
    URL             string     `json:"url"`
    ServiceName     string     `json:"service_name,omitempty"`
    Environment     string     `json:"environment,omitempty"`
    Region          string     `json:"region,omitempty"`
    IntervalSeconds int        `json:"interval_seconds"`
    LastStatus      *int       `json:"last_status"`
    LastCheckedAt   *time.Time `json:"last_checked_at"`
    IsActive        bool       `json:"is_active"`
    Tags            models.JSONMap `json:"tags,omitempty"`
    CreatedAt       time.Time  `json:"created_at"`
}

// LogEntryDTO is the response DTO for log search results
type LogEntryDTO struct {
    ID          uint           `json:"id"`
    ServiceName string         `json:"service_name"`
    Environment string         `json:"environment"`
    Region      string         `json:"region,omitempty"`
    Level       string         `json:"level"`
    Message     string         `json:"message"`
    Timestamp   time.Time      `json:"timestamp"`
    TraceID     string         `json:"trace_id,omitempty"`
    SpanID      string         `json:"span_id,omitempty"`
    Tags        models.JSONMap `json:"tags,omitempty"`
}

// TraceSpanDTO is the response DTO for trace search results
type TraceSpanDTO struct {
    ID           uint           `json:"id"`
    ServiceName  string         `json:"service_name"`
    Environment  string         `json:"environment,omitempty"`
    Operation    string         `json:"operation"`
    Status       string         `json:"status"`
    DurationMs   int            `json:"duration_ms"`
    StartTime    time.Time      `json:"start_time"`
    TraceID      string         `json:"trace_id"`
    SpanID       string         `json:"span_id"`
    ParentSpanID string         `json:"parent_span_id,omitempty"`
    Tags         models.JSONMap `json:"tags,omitempty"`
}

// SearchChecks handles POST /api/v1/checks/search
func SearchChecks(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        var req search.SearchRequest
        if err := c.BodyParser(&req); err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "invalid request body",
            })
        }
        if err := search.ValidateChecksSearch(&req); err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": err.Error(),
            })
        }
        builder := search.NewQueryBuilder(db.Model(&models.Check{}), "created_at")
        query, countQuery := builder.BuildWithCount(&req, orgID)
        var total int64
        if err := countQuery.Count(&total).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to count checks",
            })
        }
        var checks []models.Check
        if err := query.Limit(req.Limit).Offset(req.Offset).Find(&checks).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to search checks",
            })
        }
        dtos := make([]CheckSearchDTO, len(checks))
        for i, ch := range checks {
            dtos[i] = CheckSearchDTO{
                ID:              ch.ID,
                Name:            ch.Name,
                URL:             ch.URL,
                ServiceName:     ch.ServiceName,
                Environment:     ch.Environment,
                Region:          ch.Region,
                IntervalSeconds: ch.IntervalSeconds,
                LastStatus:      ch.LastStatus,
                LastCheckedAt:   ch.LastCheckedAt,
                IsActive:        ch.IsActive,
                Tags:            ch.Tags,
                CreatedAt:       ch.CreatedAt,
            }
        }
        return c.JSON(search.SearchResponse{
            Data:   dtos,
            Total:  total,
            Limit:  req.Limit,
            Offset: req.Offset,
        })
    }
}

// SearchLogs handles POST /api/v1/logs/search
func SearchLogs(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        var req search.SearchRequest
        if err := c.BodyParser(&req); err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "invalid request body",
            })
        }
        if err := search.ValidateLogsSearch(&req); err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": err.Error(),
            })
        }
        builder := search.NewQueryBuilder(db.Model(&models.LogEntry{}), "timestamp")
        query, countQuery := builder.BuildWithCount(&req, orgID)
        var total int64
        if err := countQuery.Count(&total).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to count logs",
            })
        }
        var logs []models.LogEntry
        if err := query.Limit(req.Limit).Offset(req.Offset).Find(&logs).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to search logs",
            })
        }
        dtos := make([]LogEntryDTO, len(logs))
        for i, log := range logs {
            dtos[i] = LogEntryDTO{
                ID:          log.ID,
                ServiceName: log.ServiceName,
                Environment: log.Environment,
                Region:      log.Region,
                Level:       log.Level,
                Message:     log.Message,
                Timestamp:   log.Timestamp,
                TraceID:     log.TraceID,
                SpanID:      log.SpanID,
                Tags:        log.Tags,
            }
        }
        return c.JSON(search.SearchResponse{
            Data:   dtos,
            Total:  total,
            Limit:  req.Limit,
            Offset: req.Offset,
        })
    }
}

// LogFacetsResponse contains distinct values for filterable log fields
type LogFacetsResponse struct {
    Levels       []string            `json:"levels"`
    Services     []string            `json:"services"`
    Environments []string            `json:"environments"`
    Regions      []string            `json:"regions"`
    TagKeys      []string            `json:"tag_keys"`
    TagValues    map[string][]string `json:"tag_values"`
}

// GetLogFacets returns distinct values for filterable log fields
func GetLogFacets(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)

        facets := LogFacetsResponse{
            TagValues: make(map[string][]string),
        }

        // Get distinct levels
        var levels []string
        if err := db.Model(&models.LogEntry{}).
            Where("org_id = ?", orgID).
            Distinct("level").
            Where("level != ''").
            Pluck("level", &levels).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to get levels",
            })
        }
        facets.Levels = levels

        // Get distinct service names
        var services []string
        if err := db.Model(&models.LogEntry{}).
            Where("org_id = ?", orgID).
            Distinct("service_name").
            Where("service_name != ''").
            Pluck("service_name", &services).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to get services",
            })
        }
        facets.Services = services

        // Get distinct environments
        var environments []string
        if err := db.Model(&models.LogEntry{}).
            Where("org_id = ?", orgID).
            Distinct("environment").
            Where("environment != ''").
            Pluck("environment", &environments).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to get environments",
            })
        }
        facets.Environments = environments

        // Get distinct regions
        var regions []string
        if err := db.Model(&models.LogEntry{}).
            Where("org_id = ?", orgID).
            Distinct("region").
            Where("region != ''").
            Pluck("region", &regions).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to get regions",
            })
        }
        facets.Regions = regions

        // Get distinct tag keys from JSONB column
        var tagKeys []string
        if err := db.Raw(`
            SELECT DISTINCT jsonb_object_keys(tags) as key
            FROM log_entries
            WHERE org_id = ? AND tags IS NOT NULL AND tags != '{}'::jsonb
            ORDER BY key
        `, orgID).Pluck("key", &tagKeys).Error; err != nil {
            // Log error but don't fail - tags are optional
            tagKeys = []string{}
        }
        facets.TagKeys = tagKeys

        // Get distinct values for each tag key (limit to avoid huge responses)
        for _, key := range tagKeys {
            var values []string
            // Use jsonb_exists instead of ? operator to avoid GORM placeholder conflict
            if err := db.Raw(`
                SELECT DISTINCT tags->>? as value
                FROM log_entries
                WHERE org_id = ? AND jsonb_exists(tags, ?) AND tags->>? IS NOT NULL AND tags->>? != ''
                ORDER BY value
                LIMIT 100
            `, key, orgID, key, key, key).Pluck("value", &values).Error; err != nil {
                continue // Skip this key if query fails
            }
            if len(values) > 0 {
                facets.TagValues[key] = values
            }
        }

        return c.JSON(facets)
    }
}

// SearchTraces handles POST /api/v1/traces/search
func SearchTraces(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        var req search.SearchRequest
        if err := c.BodyParser(&req); err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "invalid request body",
            })
        }
        if err := search.ValidateTracesSearch(&req); err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": err.Error(),
            })
        }
        builder := search.NewQueryBuilder(db.Model(&models.TraceSpan{}), "start_time")
        query, countQuery := builder.BuildWithCount(&req, orgID)
        var total int64
        if err := countQuery.Count(&total).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to count traces",
            })
        }
        var spans []models.TraceSpan
        if err := query.Limit(req.Limit).Offset(req.Offset).Find(&spans).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to search traces",
            })
        }
        dtos := make([]TraceSpanDTO, len(spans))
        for i, span := range spans {
            dtos[i] = TraceSpanDTO{
                ID:           span.ID,
                ServiceName:  span.ServiceName,
                Environment:  span.Environment,
                Operation:    span.Operation,
                Status:       span.Status,
                DurationMs:   span.DurationMs,
                StartTime:    span.StartTime,
                TraceID:      span.TraceID,
                SpanID:       span.SpanID,
                ParentSpanID: span.ParentSpanID,
                Tags:         span.Tags,
            }
        }
        return c.JSON(search.SearchResponse{
            Data:   dtos,
            Total:  total,
            Limit:  req.Limit,
            Offset: req.Offset,
        })
    }
}
