-- Migration: Add observability indexes for efficient filtering
-- Run after models are migrated via GORM AutoMigrate

-- ============================================
-- Check Results Indexes
-- ============================================

-- Composite index for org-scoped service/environment filtering with time range
CREATE INDEX IF NOT EXISTS idx_check_results_org_svc_env_created
ON check_results (org_id, service_name, environment, created_at DESC);

-- Index for status code filtering
CREATE INDEX IF NOT EXISTS idx_check_results_org_status_created
ON check_results (org_id, status_code, created_at DESC);

-- GIN index for JSONB tags
CREATE INDEX IF NOT EXISTS idx_check_results_tags_gin
ON check_results USING GIN (tags);

-- Trace correlation index
CREATE INDEX IF NOT EXISTS idx_check_results_trace
ON check_results (trace_id) WHERE trace_id IS NOT NULL AND trace_id != '';

-- ============================================
-- Log Entries Indexes
-- ============================================

-- Composite index for service/level filtering with timestamp
CREATE INDEX IF NOT EXISTS idx_log_entries_org_svc_level_ts
ON log_entries (org_id, service_name, level, timestamp DESC);

-- Environment-based filtering
CREATE INDEX IF NOT EXISTS idx_log_entries_org_env_ts
ON log_entries (org_id, environment, timestamp DESC);

-- GIN index for JSONB tags
CREATE INDEX IF NOT EXISTS idx_log_entries_tags_gin
ON log_entries USING GIN (tags);

-- Trace correlation index
CREATE INDEX IF NOT EXISTS idx_log_entries_trace
ON log_entries (trace_id) WHERE trace_id IS NOT NULL AND trace_id != '';

-- ============================================
-- Trace Spans Indexes
-- ============================================

-- Composite index for service/status filtering with time range
CREATE INDEX IF NOT EXISTS idx_trace_spans_org_svc_status_start
ON trace_spans (org_id, service_name, status, start_time DESC);

-- Trace ID lookup (for assembling full traces)
CREATE INDEX IF NOT EXISTS idx_trace_spans_org_trace_start
ON trace_spans (org_id, trace_id, start_time DESC);

-- GIN index for JSONB tags
CREATE INDEX IF NOT EXISTS idx_trace_spans_tags_gin
ON trace_spans USING GIN (tags);

-- Duration-based queries (finding slow spans)
CREATE INDEX IF NOT EXISTS idx_trace_spans_org_duration
ON trace_spans (org_id, duration_ms DESC, start_time DESC);

-- ============================================
-- Checks Indexes (new observability fields)
-- ============================================

-- Service/environment filtering
CREATE INDEX IF NOT EXISTS idx_checks_org_svc_env
ON checks (org_id, service_name, environment) WHERE deleted_at IS NULL;

-- GIN index for JSONB tags
CREATE INDEX IF NOT EXISTS idx_checks_tags_gin
ON checks USING GIN (tags);

-- ============================================
-- Verification queries (run in psql to verify)
-- ============================================
-- \d check_results
-- \d log_entries
-- \d trace_spans
-- \d checks
--
-- To verify an index is used:
-- EXPLAIN ANALYZE SELECT * FROM log_entries
--   WHERE org_id = 1 AND service_name = 'api' AND level = 'ERROR'
--   AND timestamp > NOW() - INTERVAL '24 hours'
--   ORDER BY timestamp DESC LIMIT 100;
