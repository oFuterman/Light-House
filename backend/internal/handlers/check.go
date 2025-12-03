package handlers

import (
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/oFuterman/light-house/internal/models"
	"github.com/oFuterman/light-house/internal/search"
	"gorm.io/gorm"
)

type CreateCheckRequest struct {
	Name            string         `json:"name"`
	URL             string         `json:"url"`
	IntervalSeconds int            `json:"interval_seconds"`
	ServiceName     string         `json:"service_name,omitempty"`
	Environment     string         `json:"environment,omitempty"`
	Region          string         `json:"region,omitempty"`
	Tags            models.JSONMap `json:"tags,omitempty"`
}

type UpdateCheckRequest struct {
	Name            *string         `json:"name,omitempty"`
	URL             *string         `json:"url,omitempty"`
	IntervalSeconds *int            `json:"interval_seconds,omitempty"`
	IsActive        *bool           `json:"is_active,omitempty"`
	ServiceName     *string         `json:"service_name,omitempty"`
	Environment     *string         `json:"environment,omitempty"`
	Region          *string         `json:"region,omitempty"`
	Tags            *models.JSONMap `json:"tags,omitempty"`
}

// ListChecks returns all checks for the current organization
func ListChecks(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)

		var checks []models.Check
		if err := db.Where("org_id = ?", orgID).Order("created_at DESC").Find(&checks).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to fetch checks",
			})
		}

		return c.JSON(checks)
	}
}

// CreateCheck creates a new uptime check
func CreateCheck(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)

		var req CreateCheckRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		// Validate input
		req.Name = strings.TrimSpace(req.Name)
		req.URL = strings.TrimSpace(req.URL)

		if req.Name == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "name is required",
			})
		}

		if req.URL == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "url is required",
			})
		}

		// Validate URL format
		parsedURL, err := url.ParseRequestURI(req.URL)
		if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid URL format (must be http or https)",
			})
		}

		// Validate interval (minimum 60 seconds)
		if req.IntervalSeconds < 60 {
			req.IntervalSeconds = 60
		}

		check := models.Check{
			OrgID:           orgID,
			Name:            req.Name,
			URL:             req.URL,
			IntervalSeconds: req.IntervalSeconds,
			IsActive:        true,
			ServiceName:     strings.TrimSpace(req.ServiceName),
			Environment:     strings.TrimSpace(req.Environment),
			Region:          strings.TrimSpace(req.Region),
			Tags:            req.Tags,
		}

		if err := db.Create(&check).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to create check",
			})
		}

		return c.Status(fiber.StatusCreated).JSON(check)
	}
}

// GetCheck returns a single check by ID
func GetCheck(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		checkID, err := strconv.ParseUint(c.Params("id"), 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid check ID",
			})
		}

		var check models.Check
		if err := db.Where("id = ? AND org_id = ?", checkID, orgID).First(&check).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "check not found",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to fetch check",
			})
		}

		return c.JSON(check)
	}
}

// UpdateCheck updates an existing check
func UpdateCheck(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		checkID, err := strconv.ParseUint(c.Params("id"), 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid check ID",
			})
		}

		// Find existing check
		var check models.Check
		if err := db.Where("id = ? AND org_id = ?", checkID, orgID).First(&check).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "check not found",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to fetch check",
			})
		}

		var req UpdateCheckRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		// Apply updates
		if req.Name != nil {
			name := strings.TrimSpace(*req.Name)
			if name == "" {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "name cannot be empty",
				})
			}
			check.Name = name
		}

		if req.URL != nil {
			urlStr := strings.TrimSpace(*req.URL)
			parsedURL, err := url.ParseRequestURI(urlStr)
			if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "invalid URL format",
				})
			}
			check.URL = urlStr
		}

		if req.IntervalSeconds != nil {
			interval := *req.IntervalSeconds
			if interval < 60 {
				interval = 60
			}
			check.IntervalSeconds = interval
		}

		if req.IsActive != nil {
			check.IsActive = *req.IsActive
		}

		if req.ServiceName != nil {
			check.ServiceName = strings.TrimSpace(*req.ServiceName)
		}

		if req.Environment != nil {
			check.Environment = strings.TrimSpace(*req.Environment)
		}

		if req.Region != nil {
			check.Region = strings.TrimSpace(*req.Region)
		}

		if req.Tags != nil {
			check.Tags = *req.Tags
		}

		if err := db.Save(&check).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to update check",
			})
		}

		return c.JSON(check)
	}
}

// DeleteCheck soft-deletes a check
func DeleteCheck(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(uint)
		checkID, err := strconv.ParseUint(c.Params("id"), 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid check ID",
			})
		}

		// Find and delete check (soft delete due to gorm.DeletedAt)
		result := db.Where("id = ? AND org_id = ?", checkID, orgID).Delete(&models.Check{})
		if result.Error != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to delete check",
			})
		}

		if result.RowsAffected == 0 {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "check not found",
			})
		}

		return c.JSON(fiber.Map{
			"message": "check deleted successfully",
		})
	}
}

// CheckResultsResponse wraps the results array for consistent API responses
type CheckResultsResponse struct {
    Results []models.CheckResult `json:"results"`
}

// GetCheckResults returns the history of check results with time window filtering
func GetCheckResults(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        checkID, err := strconv.ParseUint(c.Params("id"), 10, 32)
        if err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "invalid check ID",
            })
        }
        // Verify the check belongs to this org
        var check models.Check
        if err := db.Where("id = ? AND org_id = ?", checkID, orgID).First(&check).Error; err != nil {
            if err == gorm.ErrRecordNotFound {
                return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
                    "error": "check not found",
                })
            }
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to fetch check",
            })
        }
        // Parse limit (default 100, max 500)
        limit := 100
        if limitParam := c.Query("limit"); limitParam != "" {
            if l, err := strconv.Atoi(limitParam); err == nil && l > 0 {
                limit = l
                if limit > 500 {
                    limit = 500
                }
            }
        }
        // Parse window_hours (default 24)
        windowHours := 24
        if windowParam := c.Query("window_hours"); windowParam != "" {
            if w, err := strconv.Atoi(windowParam); err == nil && w > 0 {
                windowHours = w
            }
        }
        cutoff := time.Now().Add(-time.Duration(windowHours) * time.Hour)
        // Query results within time window
        var results []models.CheckResult
        if err := db.Where("check_id = ? AND created_at >= ?", checkID, cutoff).
            Order("created_at DESC").
            Limit(limit).
            Find(&results).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to fetch results",
            })
        }
        return c.JSON(CheckResultsResponse{Results: results})
    }
}

// CheckSummaryResponse represents aggregated statistics for a check
type CheckSummaryResponse struct {
    CheckID          uint       `json:"check_id"`
    WindowHours      int        `json:"window_hours"`
    TotalRuns        int        `json:"total_runs"`
    SuccessfulRuns   int        `json:"successful_runs"`
    FailedRuns       int        `json:"failed_runs"`
    UptimePercentage float64    `json:"uptime_percentage"`
    AvgResponseMs    int        `json:"avg_response_ms"`
    P95ResponseMs    int        `json:"p95_response_ms"`
    LastStatus       *int       `json:"last_status"`
    LastCheckedAt    *time.Time `json:"last_checked_at"`
}

// GetCheckSummary returns aggregated statistics for a check within a time window
func GetCheckSummary(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        checkID, err := strconv.ParseUint(c.Params("id"), 10, 32)
        if err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "invalid check ID",
            })
        }
        // Load check and verify org ownership
        var check models.Check
        if err := db.Where("id = ? AND org_id = ?", checkID, orgID).First(&check).Error; err != nil {
            if err == gorm.ErrRecordNotFound {
                return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
                    "error": "check not found",
                })
            }
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to fetch check",
            })
        }
        // Parse window_hours (default 24, max 720)
        windowHours := 24
        if windowParam := c.Query("window_hours"); windowParam != "" {
            if w, err := strconv.Atoi(windowParam); err == nil && w > 0 {
                windowHours = w
                if windowHours > 720 {
                    windowHours = 720
                }
            }
        }
        cutoff := time.Now().Add(-time.Duration(windowHours) * time.Hour)
        // Fetch results within time window, ordered by response time for p95 calculation
        var results []models.CheckResult
        if err := db.Where("check_id = ? AND created_at >= ?", check.ID, cutoff).
            Order("response_time_ms ASC").
            Find(&results).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to fetch results",
            })
        }
        // Build response with check metadata
        summary := CheckSummaryResponse{
            CheckID:       check.ID,
            WindowHours:   windowHours,
            LastStatus:    check.LastStatus,
            LastCheckedAt: check.LastCheckedAt,
        }
        totalRuns := len(results)
        summary.TotalRuns = totalRuns
        // Return early if no results
        if totalRuns == 0 {
            return c.JSON(summary)
        }
        // Compute statistics
        var successfulRuns int
        var totalResponseMs int64
        for _, r := range results {
            if r.StatusCode >= 200 && r.StatusCode <= 299 {
                successfulRuns++
            }
            totalResponseMs += r.ResponseTimeMs
        }
        summary.SuccessfulRuns = successfulRuns
        summary.FailedRuns = totalRuns - successfulRuns
        summary.UptimePercentage = float64(successfulRuns) / float64(totalRuns) * 100
        summary.AvgResponseMs = int(totalResponseMs / int64(totalRuns))
        summary.P95ResponseMs = int(results[p95Index(totalRuns)].ResponseTimeMs)
        return c.JSON(summary)
    }
}

// p95Index returns the index for the 95th percentile in a sorted slice
func p95Index(length int) int {
    idx := int(float64(length) * 0.95)
    if idx >= length {
        idx = length - 1
    }
    return idx
}

// CheckResultSearchDTO is the response DTO for check result search
type CheckResultSearchDTO struct {
    ID             uint      `json:"id"`
    StatusCode     int       `json:"status_code"`
    ResponseTimeMs int64     `json:"response_time_ms"`
    ErrorMessage   string    `json:"error_message,omitempty"`
    CreatedAt      time.Time `json:"created_at"`
}

// SearchCheckResults handles POST /api/v1/checks/:id/results/search
func SearchCheckResults(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        checkID, err := strconv.ParseUint(c.Params("id"), 10, 32)
        if err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "invalid check ID",
            })
        }
        // Verify the check belongs to this org
        var check models.Check
        if err := db.Where("id = ? AND org_id = ?", checkID, orgID).First(&check).Error; err != nil {
            if err == gorm.ErrRecordNotFound {
                return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
                    "error": "check not found",
                })
            }
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to fetch check",
            })
        }
        // Parse search request
        var req search.SearchRequest
        if err := c.BodyParser(&req); err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "invalid request body",
            })
        }
        // Validate search request
        if err := search.ValidateCheckResultsSearch(&req); err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": err.Error(),
            })
        }
        // Build query with check_id constraint
        // Use BuildWithCountNoOrg since we already verified check ownership above
        builder := search.NewQueryBuilder(db.Model(&models.CheckResult{}).Where("check_id = ?", check.ID), "created_at")
        query, countQuery := builder.BuildWithCountNoOrg(&req)
        // Get total count
        var total int64
        if err := countQuery.Count(&total).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to count results",
            })
        }
        // Fetch results
        var results []models.CheckResult
        if err := query.Limit(req.Limit).Offset(req.Offset).Find(&results).Error; err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to search results",
            })
        }
        // Map to DTOs
        dtos := make([]CheckResultSearchDTO, len(results))
        for i, r := range results {
            dtos[i] = CheckResultSearchDTO{
                ID:             r.ID,
                StatusCode:     r.StatusCode,
                ResponseTimeMs: r.ResponseTimeMs,
                ErrorMessage:   r.ErrorMessage,
                CreatedAt:      r.CreatedAt,
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
