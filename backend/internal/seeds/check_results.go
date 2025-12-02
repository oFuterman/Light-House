package seeds

import (
    "fmt"
    "math/rand"
    "time"

    "github.com/oFuterman/light-house/internal/models"
    "gorm.io/gorm"
)

// SeedCheckResults creates realistic CheckResult data for development/testing.
// It generates `count` results spanning the last 7 days with:
// - ~90% success rate (status 200)
// - ~10% failures (status 500/502/503/504)
// - Response times: 50-300ms for success, 500-1500ms for failures
func SeedCheckResults(db *gorm.DB, checkID uint, count int) error {
    // Verify check exists
    var check models.Check
    if err := db.First(&check, checkID).Error; err != nil {
        return fmt.Errorf("check with ID %d not found: %w", checkID, err)
    }

    now := time.Now()
    sevenDaysAgo := now.Add(-7 * 24 * time.Hour)
    timeSpan := now.Sub(sevenDaysAgo)

    results := make([]models.CheckResult, 0, count)
    for i := 0; i < count; i++ {
        // Spread timestamps evenly with some jitter
        baseOffset := time.Duration(i) * timeSpan / time.Duration(count)
        jitter := time.Duration(rand.Int63n(int64(timeSpan / time.Duration(count))))
        createdAt := sevenDaysAgo.Add(baseOffset + jitter)

        // 90% success (200), 10% failure (500/502/503/504)
        statusCode := 200
        success := true
        errorMsg := ""
        if rand.Float32() < 0.10 {
            failureCodes := []int{500, 502, 503, 504}
            statusCode = failureCodes[rand.Intn(len(failureCodes))]
            success = false
            errorMsg = "simulated failure for dev testing"
        }

        // Response time: 50-300ms normally, 500-1500ms for failures
        responseMs := int64(50 + rand.Intn(250))
        if !success {
            responseMs = int64(500 + rand.Intn(1000))
        }

        results = append(results, models.CheckResult{
            CheckID:        checkID,
            StatusCode:     statusCode,
            ResponseTimeMs: responseMs,
            Success:        success,
            ErrorMessage:   errorMsg,
            CreatedAt:      createdAt,
        })
    }

    // Insert in batches for efficiency
    if err := db.CreateInBatches(results, 50).Error; err != nil {
        return fmt.Errorf("failed to seed results: %w", err)
    }

    fmt.Printf("Successfully seeded %d results for check ID %d\n", count, checkID)
    return nil
}

// SeedAllChecks seeds results for all checks in the database
func SeedAllChecks(db *gorm.DB, countPerCheck int) error {
    var checks []models.Check
    if err := db.Find(&checks).Error; err != nil {
        return fmt.Errorf("failed to fetch checks: %w", err)
    }

    if len(checks) == 0 {
        return fmt.Errorf("no checks found in database")
    }

    for _, check := range checks {
        if err := SeedCheckResults(db, check.ID, countPerCheck); err != nil {
            return err
        }
    }

    fmt.Printf("Successfully seeded %d results for %d checks\n", countPerCheck*len(checks), len(checks))
    return nil
}
