package database

import (
    "log"
    "github.com/oFuterman/light-house/internal/config"
    "github.com/oFuterman/light-house/internal/models"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
    logLevel := logger.Info
    if cfg.Environment == "production" {
        logLevel = logger.Warn
    }
    db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
        Logger: logger.Default.LogMode(logLevel),
    })
    if err != nil {
        return nil, err
    }
    return db, nil
}

func Migrate(db *gorm.DB) error {
    err := db.AutoMigrate(
        &models.Organization{},
        &models.User{},
        &models.Check{},
        &models.CheckResult{},
        &models.LogEvent{},
        &models.LogEntry{},
        &models.TraceSpan{},
        &models.APIKey{},
        &models.Alert{},
        &models.NotificationSettings{},
    )
    if err != nil {
        return err
    }
    // Run custom index migrations
    if err := createObservabilityIndexes(db); err != nil {
        log.Printf("Warning: some indexes may not have been created: %v", err)
    }
    return nil
}

func createObservabilityIndexes(db *gorm.DB) error {
    indexes := []string{
        // Check Results indexes
        `CREATE INDEX IF NOT EXISTS idx_check_results_org_svc_env_created ON check_results (org_id, service_name, environment, created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_check_results_org_status_created ON check_results (org_id, status_code, created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_check_results_tags_gin ON check_results USING GIN (tags)`,
        // Log Entries indexes
        `CREATE INDEX IF NOT EXISTS idx_log_entries_org_env_ts ON log_entries (org_id, environment, timestamp DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_log_entries_tags_gin ON log_entries USING GIN (tags)`,
        `CREATE INDEX IF NOT EXISTS idx_log_entries_trace ON log_entries (trace_id) WHERE trace_id IS NOT NULL AND trace_id != ''`,
        // Trace Spans indexes
        `CREATE INDEX IF NOT EXISTS idx_trace_spans_org_trace_start ON trace_spans (org_id, trace_id, start_time DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_trace_spans_tags_gin ON trace_spans USING GIN (tags)`,
        `CREATE INDEX IF NOT EXISTS idx_trace_spans_org_duration ON trace_spans (org_id, duration_ms DESC, start_time DESC)`,
        // Checks indexes
        `CREATE INDEX IF NOT EXISTS idx_checks_org_svc_env ON checks (org_id, service_name, environment) WHERE deleted_at IS NULL`,
        `CREATE INDEX IF NOT EXISTS idx_checks_tags_gin ON checks USING GIN (tags)`,
    }
    for _, idx := range indexes {
        if err := db.Exec(idx).Error; err != nil {
            log.Printf("Index creation warning: %v", err)
        }
    }
    return nil
}
