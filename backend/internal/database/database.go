package database

import (
    "fmt"
    "log"
    "strings"

    "github.com/oFuterman/light-house/internal/config"
    "github.com/oFuterman/light-house/internal/models"
    "github.com/oFuterman/light-house/internal/utils"
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
        &models.Invite{},
        &models.AuditLog{},
        &models.MonthlyUsage{},
    )
    if err != nil {
        return err
    }
    // Run custom index migrations
    if err := createObservabilityIndexes(db); err != nil {
        log.Printf("Warning: some indexes may not have been created: %v", err)
    }
    // Run data migrations
    if err := migrateExistingUsers(db); err != nil {
        log.Printf("Warning: user migration may have failed: %v", err)
    }
    if err := migrateExistingOrgsToFreePlan(db); err != nil {
        log.Printf("Warning: org plan migration may have failed: %v", err)
    }
    if err := migrateOrganizationSlugs(db); err != nil {
        log.Printf("Warning: org slug migration may have failed: %v", err)
    }
    if err := migrateOrgNameUniqueness(db); err != nil {
        log.Printf("Warning: org name uniqueness migration may have failed: %v", err)
    }
    return nil
}

// migrateExistingUsers sets default role for existing users without one
func migrateExistingUsers(db *gorm.DB) error {
    // Set existing users without a role to 'owner' (they created the org)
    return db.Exec(`
        UPDATE users
        SET role = 'owner'
        WHERE role IS NULL OR role = ''
    `).Error
}

// migrateExistingOrgsToFreePlan ensures all existing orgs have a plan set
func migrateExistingOrgsToFreePlan(db *gorm.DB) error {
    // Set existing orgs without a plan to 'free'
    return db.Exec(`
        UPDATE organizations
        SET plan = 'free'
        WHERE plan IS NULL OR plan = ''
    `).Error
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

// migrateOrgNameUniqueness deduplicates existing org names and creates a
// case-insensitive unique index. Runs in a transaction for atomicity.
func migrateOrgNameUniqueness(db *gorm.DB) error {
    return db.Transaction(func(tx *gorm.DB) error {
        // Find duplicate org names (case-insensitive) among non-deleted orgs
        type dupRow struct {
            LowerName string
            Ids       string
        }
        var dups []dupRow
        if err := tx.Raw(`
            SELECT LOWER(name) as lower_name, array_agg(id ORDER BY id)::text as ids
            FROM organizations
            WHERE deleted_at IS NULL
            GROUP BY LOWER(name)
            HAVING COUNT(*) > 1
        `).Scan(&dups).Error; err != nil {
            return fmt.Errorf("failed to find duplicate org names: %w", err)
        }

        // Deduplicate: keep oldest org's name, append (2), (3) to others
        for _, dup := range dups {
            // Parse the PostgreSQL array string "{1,5,12}" into IDs
            trimmed := strings.Trim(dup.Ids, "{}")
            parts := strings.Split(trimmed, ",")

            for i, idStr := range parts {
                if i == 0 {
                    continue // Keep the oldest org's name as-is
                }
                idStr = strings.TrimSpace(idStr)
                suffix := fmt.Sprintf(" (%d)", i+1)
                if err := tx.Exec(
                    `UPDATE organizations SET name = name || ? WHERE id = ?`,
                    suffix, idStr,
                ).Error; err != nil {
                    return fmt.Errorf("failed to rename duplicate org %s: %w", idStr, err)
                }
                log.Printf("  Renamed duplicate org %s: appended '%s'", idStr, suffix)
            }
        }

        // Create partial unique index (case-insensitive, excludes soft-deleted)
        if err := tx.Exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_name_unique
            ON organizations (LOWER(name))
            WHERE deleted_at IS NULL
        `).Error; err != nil {
            return fmt.Errorf("failed to create org name unique index: %w", err)
        }

        return nil
    })
}

// migrateOrganizationSlugs generates slugs for existing orgs without them
// Mitigates: B4 (partial migration) - runs in transaction for atomicity
func migrateOrganizationSlugs(db *gorm.DB) error {
    return db.Transaction(func(tx *gorm.DB) error {
        // Find all orgs with empty slug
        var orgs []models.Organization
        if err := tx.Where("slug IS NULL OR slug = ''").Find(&orgs).Error; err != nil {
            return err
        }

        if len(orgs) == 0 {
            return nil // No orgs need migration
        }

        log.Printf("Migrating slugs for %d organizations...", len(orgs))

        // Generate unique slug for each org
        for _, org := range orgs {
            baseSlug := utils.GenerateSlug(org.Name)
            if baseSlug == "" {
                // B2 mitigation: fallback for empty/unicode names
                baseSlug = fmt.Sprintf("org-%d", org.ID)
            }

            slug, err := utils.EnsureUniqueSlug(tx, baseSlug, &org.ID)
            if err != nil {
                return fmt.Errorf("failed to generate slug for org %d (%s): %w", org.ID, org.Name, err)
            }

            if err := tx.Model(&org).Update("slug", slug).Error; err != nil {
                return fmt.Errorf("failed to update slug for org %d: %w", org.ID, err)
            }

            log.Printf("  Org %d: %s -> %s", org.ID, org.Name, slug)
        }

        log.Printf("Slug migration completed successfully")
        return nil
    })
}
