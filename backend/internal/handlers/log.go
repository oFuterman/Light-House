package handlers

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/oFuterman/light-house/internal/billing"
	"github.com/oFuterman/light-house/internal/models"
	"gorm.io/gorm"
)

// Maximum logs per ingestion request
const MaxLogsPerRequest = 1000

// IngestLogEntry represents a single log entry in the ingestion request
type IngestLogEntry struct {
	ServiceName string                 `json:"service_name"`
	Environment string                 `json:"environment,omitempty"`
	Region      string                 `json:"region,omitempty"`
	Level       string                 `json:"level"`
	Message     string                 `json:"message"`
	Timestamp   string                 `json:"timestamp,omitempty"`
	TraceID     string                 `json:"trace_id,omitempty"`
	SpanID      string                 `json:"span_id,omitempty"`
	Tags        map[string]interface{} `json:"tags,omitempty"`
}

// IngestLogRequest supports both single log and batch ingestion
type IngestLogRequest struct {
	// Single log (legacy support)
	ServiceName string                 `json:"service_name,omitempty"`
	Environment string                 `json:"environment,omitempty"`
	Region      string                 `json:"region,omitempty"`
	Level       string                 `json:"level,omitempty"`
	Message     string                 `json:"message,omitempty"`
	Timestamp   string                 `json:"timestamp,omitempty"`
	TraceID     string                 `json:"trace_id,omitempty"`
	SpanID      string                 `json:"span_id,omitempty"`
	Tags        map[string]interface{} `json:"tags,omitempty"`

	// Batch logs
	Logs []IngestLogEntry `json:"logs,omitempty"`
}

// IngestLogResponse is the response for log ingestion
type IngestLogResponse struct {
	Accepted    int    `json:"accepted"`
	BytesUsed   int64  `json:"bytes_used"`
	Warning     string `json:"warning,omitempty"`
	UpgradeURL  string `json:"upgrade_url,omitempty"`
}

// IngestLog accepts JSON log events via API key authentication
// POST /api/v1/logs
func IngestLog(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)

		// Parse request body
		var req IngestLogRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body: " + err.Error(),
			})
		}

		// Build log entries from request (support both single and batch)
		var entries []IngestLogEntry
		if len(req.Logs) > 0 {
			entries = req.Logs
		} else if req.Message != "" {
			// Single log entry (legacy format)
			entries = []IngestLogEntry{{
				ServiceName: req.ServiceName,
				Environment: req.Environment,
				Region:      req.Region,
				Level:       req.Level,
				Message:     req.Message,
				Timestamp:   req.Timestamp,
				TraceID:     req.TraceID,
				SpanID:      req.SpanID,
				Tags:        req.Tags,
			}}
		}

		// Handle empty request
		if len(entries) == 0 {
			return c.JSON(IngestLogResponse{
				Accepted:  0,
				BytesUsed: 0,
			})
		}

		// Enforce batch size limit (FM4)
		if len(entries) > MaxLogsPerRequest {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":     "batch size exceeds limit",
				"max_logs":  MaxLogsPerRequest,
				"submitted": len(entries),
			})
		}

		// Load org to get plan (FM2, FM8)
		var org models.Organization
		if err := db.First(&org, orgID).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to load organization",
			})
		}

		// Calculate incoming bytes (estimate from JSON size)
		incomingBytes := calculateLogBytes(entries)

		// Get current log volume for this month
		currentVolume, err := billing.GetCurrentLogVolume(db, orgID)
		if err != nil {
			// Fail closed - reject if we can't verify limits (FM8)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to check usage limits",
			})
		}

		// Check if we can ingest these logs
		allowed, atWarning, message := billing.CanIngestLogs(org.Plan, currentVolume, incomingBytes)
		if !allowed {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":       message,
				"limit_type":  "log_volume",
				"upgrade_url": "/settings?tab=billing",
			})
		}

		// Convert to LogEntry models
		now := time.Now()
		logEntries := make([]models.LogEntry, 0, len(entries))
		for _, entry := range entries {
			// Parse timestamp or default to now (FM5)
			ts := now
			if entry.Timestamp != "" {
				if parsed, err := time.Parse(time.RFC3339, entry.Timestamp); err == nil {
					ts = parsed
				} else if parsed, err := time.Parse(time.RFC3339Nano, entry.Timestamp); err == nil {
					ts = parsed
				}
				// If parsing fails, keep default (now)
			}

			// Normalize level
			level := strings.ToUpper(strings.TrimSpace(entry.Level))
			if level == "" {
				level = "INFO"
			}
			if !isValidLogLevel(level) {
				level = "INFO"
			}

			// Convert tags
			var tags models.JSONMap
			if entry.Tags != nil {
				tags = models.JSONMap(entry.Tags)
			}

			logEntries = append(logEntries, models.LogEntry{
				OrgID:       orgID,
				ServiceName: strings.TrimSpace(entry.ServiceName),
				Environment: strings.TrimSpace(entry.Environment),
				Region:      strings.TrimSpace(entry.Region),
				Level:       level,
				Message:     entry.Message,
				Timestamp:   ts,
				TraceID:     strings.TrimSpace(entry.TraceID),
				SpanID:      strings.TrimSpace(entry.SpanID),
				Tags:        tags,
			})
		}

		// Insert logs in a batch
		if err := db.CreateInBatches(logEntries, 100).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to store logs",
			})
		}

		// Increment log volume (best-effort - FM7)
		billing.IncrementLogVolume(db, orgID, incomingBytes)

		// Build response
		response := IngestLogResponse{
			Accepted:  len(logEntries),
			BytesUsed: incomingBytes,
		}

		// Add warning header and response field if at threshold
		if atWarning {
			response.Warning = message
			response.UpgradeURL = "/settings?tab=billing"
			c.Set("X-Usage-Warning", message)
		}

		return c.Status(fiber.StatusCreated).JSON(response)
	}
}

// calculateLogBytes estimates the size of log entries in bytes
func calculateLogBytes(entries []IngestLogEntry) int64 {
	// Serialize to JSON to get accurate byte count
	data, err := json.Marshal(entries)
	if err != nil {
		// Fallback: estimate 500 bytes per log entry
		return int64(len(entries) * 500)
	}
	return int64(len(data))
}

// isValidLogLevel checks if the level is a valid log level
func isValidLogLevel(level string) bool {
	switch level {
	case "DEBUG", "INFO", "WARN", "WARNING", "ERROR", "FATAL", "TRACE":
		return true
	}
	return false
}

// ListLogs returns recent log events for the current organization
// GET /api/v1/logs
func ListLogs(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)

		// Parse query params
		limit := c.QueryInt("limit", 50)
		if limit > 1000 {
			limit = 1000
		}
		offset := c.QueryInt("offset", 0)
		level := c.Query("level")

		// Build query
		query := db.Where("org_id = ?", orgID)
		if level != "" {
			query = query.Where("level = ?", strings.ToUpper(level))
		}

		// Fetch logs
		var logs []models.LogEntry
		if err := query.Order("timestamp DESC").
			Limit(limit).
			Offset(offset).
			Find(&logs).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to fetch logs",
			})
		}

		return c.JSON(fiber.Map{
			"logs":   logs,
			"limit":  limit,
			"offset": offset,
		})
	}
}
